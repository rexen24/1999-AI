// Authentic 1999 Courage Computer Sound, Context-Aware Show Cadence & Exact Playhead-Locked Voice-Typewriter Engine

export type SlideStyle = 'NORMAL' | 'GIANT' | 'LIST' | 'COMPARE' | 'VISUAL';

export interface SlideSpec {
  style: SlideStyle;
  text: string;
  boxTitle?: string;
  compareLeft?: string;
  compareRight?: string;
  compareLeftImageUrl?: string | null;
  compareRightImageUrl?: string | null;
  visualSubject?: string;
  visualImageUrl?: string | null;
  ttsId?: string;
}

export interface SpeechEnvelope {
  trimStartSec: number;
  speechEndSec: number;
  effectiveDurationSec: number;
  cumulativeEnergy: Float32Array;
  bucketDurationSec: number;
}

export interface DecodedSlide extends SlideSpec {
  audioBuffer: AudioBuffer | null;
  audioBase64: string | null;
  audioMimeType: string | null;
  envelope?: SpeechEnvelope | null;
}

export interface ActiveSlideRender {
  style: SlideStyle;
  typedText: string;
  fullText: string;
  boxTitle?: string;
  compareLeft?: string;
  compareRight?: string;
  compareLeftImageUrl?: string | null;
  compareRightImageUrl?: string | null;
  visualSubject?: string;
  visualImageUrl?: string | null;
}

export function formatNumberedListText(raw: string): string {
  // Ensure 2., 3., 4. (or 2), 3)) always start on a new line underneath 1. instead of in a single sentence!
  return raw
    .replace(/([^\n])\s+(\b[2-9][.)]\s+)/g, '$1\n$2')
    .replace(/([^\n])\s+(\bSTEP\s+[2-9][:.)]?\s+)/gi, '$1\n$2');
}

function buildSpeechTimeline(text: string): { weights: number[]; totalWeight: number } {
  const weights: number[] = [];
  let totalWeight = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nextCh = text[i + 1] || '';
    let w = 1.0;

    if (ch === '.' && nextCh === '.') {
      w = 1.6;
    } else if (ch === '.' || ch === '!' || ch === '?') {
      w = 3.8;
    } else if (ch === ',' || ch === ';' || ch === ':' || ch === '—' || ch === '-') {
      w = 2.4;
    } else if (ch === '\n') {
      w = 2.2;
    } else if (ch === ' ') {
      w = 0.6;
    } else if (/[AEIOUaeiou]/.test(ch)) {
      w = 1.15;
    } else {
      w = 0.9;
    }

    weights.push(w);
    totalWeight += w;
  }

  return { weights, totalWeight: Math.max(1, totalWeight) };
}

function sliceBySpeechProgress(text: string, progress: number): string {
  if (!text) return '';
  if (progress <= 0) return '';
  if (progress >= 1) return text;

  const { weights, totalWeight } = buildSpeechTimeline(text);
  const target = progress * totalWeight;
  let running = 0;
  for (let i = 0; i < text.length; i++) {
    running += weights[i];
    if (running >= target) {
      return text.slice(0, i + 1);
    }
  }
  return text;
}

/**
 * Keeps playbackRate at 1.0 (100% original natural Simon Prebble voice pitch without resampling distortion)
 * while varying the dramatic pause (`postSlidePauseMs`) based on the slide's context and mood.
 */
function getContextualSpeechPace(slide: DecodedSlide): {
  playbackRate: number;
  postSlidePauseMs: number;
} {
  const text = (slide.text || '').trim();
  const upper = text.toUpperCase();

  // 1. Startled / Angry / Irritated Interruptions (snappier transition)
  const isAngryOrStartled =
    /\b(STOP POKING|STOP SHAKING|GET YOUR THUMB|THIEF|PLAGIARIST|NOT SOCIAL MEDIA|SHOUTING IN ALL CAPITALS|I SAW THAT|HAMMERING THE KEYBOARD)\b/.test(
      upper
    );
  if (isAngryOrStartled) {
    return { playbackRate: 1.0, postSlidePauseMs: 220 };
  }

  // 2. GIANT Deadpan Closers, Insults & Boot Openers (longer deadpan pause)
  if (slide.style === 'GIANT') {
    if (upper.length <= 22) {
      return { playbackRate: 1.0, postSlidePauseMs: 420 };
    }
    return { playbackRate: 1.0, postSlidePauseMs: 380 };
  }

  // 3. Classic Show "Oh......" / Dramatic Ellipsis Hooks
  if (text.includes('...') || upper.startsWith('SEARCH FOUND:')) {
    return { playbackRate: 1.0, postSlidePauseMs: 340 };
  }

  // 4. Stacked Numbered Lists (1. and 2.)
  if (slide.style === 'LIST' || /\b1[.)]\s+/.test(text)) {
    return { playbackRate: 1.0, postSlidePauseMs: 360 };
  }

  // 5. Specimen Visualizers & Side-by-Side Comparisons
  if (slide.style === 'VISUAL' || slide.style === 'COMPARE' || Boolean(slide.visualSubject)) {
    return { playbackRate: 1.0, postSlidePauseMs: 340 };
  }

  // 6. Sarcastic Interrogation / Follow-Up Questions
  if (text.includes('?')) {
    return { playbackRate: 1.0, postSlidePauseMs: 320 };
  }

  // 7. Standard Deadpan Banter & Forensics Observations
  return { playbackRate: 1.0, postSlidePauseMs: 280 };
}

/**
 * Analyzes the actual PCM waveform of the decoded AudioBuffer to find:
 * 1) Exact voice onset (`trimStartSec`) so dead MP3 leading silence is skipped cleanly
 * 2) Exact voice finish (`speechEndSec`) so the final letter lands right as the final syllable ends
 * 3) Cumulative vocal energy curve (`cumulativeEnergy`) so pauses in the voice ("Oh......") pause the typing,
 *    and spoken syllables advance the text in exact 1:1 lockstep with the voice!
 */
function analyzeAudioBufferEnvelope(buffer: AudioBuffer): SpeechEnvelope {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const totalDuration = buffer.duration;
  const bucketDurationSec = 0.02; // 20ms high-precision buckets (50fps envelope)
  const samplesPerBucket = Math.max(1, Math.floor(sampleRate * bucketDurationSec));
  const numBuckets = Math.max(1, Math.ceil(data.length / samplesPerBucket));
  const rmsBuckets = new Float32Array(numBuckets);

  let maxRms = 0;
  for (let b = 0; b < numBuckets; b++) {
    const start = b * samplesPerBucket;
    const end = Math.min(data.length, start + samplesPerBucket);
    let sumSq = 0;
    for (let i = start; i < end; i++) {
      const s = data[i];
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, end - start));
    rmsBuckets[b] = rms;
    if (rms > maxRms) maxRms = rms;
  }

  const silenceThreshold = Math.max(0.005, maxRms * 0.06);
  let firstActiveBucket = 0;
  let lastActiveBucket = numBuckets - 1;

  for (let b = 0; b < numBuckets; b++) {
    if (rmsBuckets[b] >= silenceThreshold) {
      firstActiveBucket = b;
      break;
    }
  }

  for (let b = numBuckets - 1; b >= firstActiveBucket; b--) {
    if (rmsBuckets[b] >= silenceThreshold) {
      lastActiveBucket = b;
      break;
    }
  }

  const trimStartSec = Math.max(0, firstActiveBucket * bucketDurationSec - 0.01);
  const speechEndSec = Math.min(
    totalDuration,
    (lastActiveBucket + 1) * bucketDurationSec + 0.015
  );
  const effectiveDurationSec = Math.max(0.22, speechEndSec - trimStartSec);

  // Build cumulative vocal energy curve across the active speech window [firstActiveBucket..lastActiveBucket]
  const activeCount = Math.max(1, lastActiveBucket - firstActiveBucket + 1);
  const cumulativeEnergy = new Float32Array(activeCount);
  let runningEnergy = 0;

  for (let i = 0; i < activeCount; i++) {
    const rms = rmsBuckets[firstActiveBucket + i];
    // When voice is silent (pauses like "Oh......" or commas), advance almost zero (0.02) so text waits for the voice!
    // When voice is speaking, advance proportionally to syllable energy!
    const weight =
      rms >= silenceThreshold * 0.75
        ? Math.pow(rms / Math.max(0.001, maxRms), 0.7) + 0.15
        : 0.02;
    runningEnergy += weight;
    cumulativeEnergy[i] = runningEnergy;
  }

  if (runningEnergy > 0) {
    for (let i = 0; i < activeCount; i++) {
      cumulativeEnergy[i] = cumulativeEnergy[i] / runningEnergy;
    }
  } else {
    for (let i = 0; i < activeCount; i++) {
      cumulativeEnergy[i] = (i + 1) / activeCount;
    }
  }

  return {
    trimStartSec,
    speechEndSec,
    effectiveDurationSec,
    cumulativeEnergy,
    bucketDurationSec,
  };
}

/**
 * Computes exact [0..1] speech progress for the current playhead position (`bufferElapsedSec`)
 * inside the trimmed audio buffer. Zero artificial lead so text never races ahead of the voice!
 */
function getEnvelopeSpeechProgress(envelope: SpeechEnvelope, bufferElapsedSec: number): number {
  if (bufferElapsedSec <= 0) return 0.01;
  if (bufferElapsedSec >= envelope.effectiveDurationSec) return 1;

  const exactBucket = bufferElapsedSec / envelope.bucketDurationSec;
  const idx = Math.floor(exactBucket);
  const frac = exactBucket - idx;
  const arr = envelope.cumulativeEnergy;

  if (idx >= arr.length - 1) return 1;
  const prev = idx <= 0 ? 0 : arr[idx - 1];
  const curr = arr[Math.max(0, idx)];
  const energyProgress = prev + (curr - prev) * frac;

  const linearProgress = Math.min(1, bufferElapsedSec / envelope.effectiveDurationSec);
  // 80% real vocal waveform energy + 20% linear playhead anchor for exact word-for-word locking
  return Math.min(1, Math.max(0.01, energyProgress * 0.8 + linearProgress * 0.2));
}

class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private activeVoiceSource: AudioBufferSourceNode | null = null;
  private activeHtmlAudio: HTMLAudioElement | null = null;
  private activeWaitingLoopStop: (() => void) | null = null;
  private rafId: number | null = null;
  private typewriterTimer: ReturnType<typeof setInterval> | null = null;
  private playbackCancelled: boolean = false;
  private decodedCache = new Map<string, { buffer: AudioBuffer; envelope: SpeechEnvelope }>();

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlockAudio();
      };
      window.addEventListener('touchstart', unlockHandler, { passive: true });
      window.addEventListener('touchend', unlockHandler, { passive: true });
      window.addEventListener('pointerdown', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
    }
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAudio() {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {
      // Ignore
    }
  }

  public vibrate(pattern: number | number[]) {
    if (this.isMuted) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore on unsupported devices
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopWaitingSound();
      this.stopVoice();
    }
  }

  public playBootSequenceSound() {
    if (this.isMuted) return;
    this.vibrate([35, 30, 20]);
    try {
      const ctx = this.getContext();
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;

      const degaussOsc = ctx.createOscillator();
      const degaussGain = ctx.createGain();
      degaussOsc.type = 'sawtooth';
      degaussOsc.frequency.setValueAtTime(92, now);
      degaussOsc.frequency.exponentialRampToValueAtTime(48, now + 0.35);
      degaussGain.gain.setValueAtTime(0.065, now);
      degaussGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      degaussOsc.connect(degaussGain);
      degaussGain.connect(ctx.destination);
      degaussOsc.start(now);
      degaussOsc.stop(now + 0.4);

      const sweepOsc = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweepOsc.type = 'sine';
      sweepOsc.frequency.setValueAtTime(180, now + 0.06);
      sweepOsc.frequency.exponentialRampToValueAtTime(2800, now + 0.5);
      sweepGain.gain.setValueAtTime(0.032, now + 0.06);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.54);
      sweepOsc.connect(sweepGain);
      sweepGain.connect(ctx.destination);
      sweepOsc.start(now + 0.06);
      sweepOsc.stop(now + 0.56);

      for (let i = 0; i < 10; i++) {
        const tickTime = now + 0.48 + i * 0.045;
        const tickOsc = ctx.createOscillator();
        const tickGain = ctx.createGain();
        tickOsc.type = 'square';
        tickOsc.frequency.setValueAtTime(1380 + i * 50, tickTime);
        tickGain.gain.setValueAtTime(0.02, tickTime);
        tickGain.gain.exponentialRampToValueAtTime(0.001, tickTime + 0.018);
        tickOsc.connect(tickGain);
        tickGain.connect(ctx.destination);
        tickOsc.start(tickTime);
        tickOsc.stop(tickTime + 0.022);
      }

      const postBeep = ctx.createOscillator();
      const postGain = ctx.createGain();
      postBeep.type = 'square';
      postBeep.frequency.setValueAtTime(1046.5, now + 0.98);
      postGain.gain.setValueAtTime(0.05, now + 0.98);
      postGain.gain.exponentialRampToValueAtTime(0.001, now + 1.12);
      postBeep.connect(postGain);
      postGain.connect(ctx.destination);
      postBeep.start(now + 0.98);
      postBeep.stop(now + 1.15);
    } catch {
      // Ignore
    }
  }

  public playKeyClick(key?: string) {
    if (this.isMuted) return;
    this.vibrate(key === 'Enter' ? 18 : 6);
    try {
      const ctx = this.getContext();
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;

      if (key === 'Enter') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(990, now + 0.035);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.095);
        return;
      }

      if (key === 'Backspace') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.035);
        gain.gain.setValueAtTime(0.038, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.045);
        return;
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1350 + Math.random() * 300, now);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.017);
    } catch {
      // Ignore
    }
  }

  public playTypewriterTick() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1500 + Math.random() * 180, now);
      gain.gain.setValueAtTime(0.018, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.01);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.012);
    } catch {
      // Ignore
    }
  }

  // Iconic Rapid Ringing Cartoon Bell Sound Effect + Android Haptic Bell Pulse
  public playSearchFoundBell() {
    if (this.isMuted) return;
    this.vibrate([45, 25, 45, 25, 45, 25, 70]);
    try {
      const ctx = this.getContext();
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;

      const totalStrikes = 20;
      const strikeInterval = 0.036;

      for (let idx = 0; idx < totalStrikes; idx++) {
        const isFinalStrike = idx === totalStrikes - 1;
        const strikeTime = now + idx * strikeInterval;

        const baseFreq = idx % 2 === 0 ? 1960.0 : 2349.32;
        const bellPartials = [
          { freq: baseFreq, amp: 0.14, decay: isFinalStrike ? 0.45 : 0.06 },
          { freq: baseFreq * 1.48, amp: 0.085, decay: isFinalStrike ? 0.3 : 0.045 },
          { freq: baseFreq * 2.12, amp: 0.055, decay: isFinalStrike ? 0.2 : 0.035 },
          { freq: 5400.0, amp: 0.035, decay: 0.025 },
        ];

        bellPartials.forEach(({ freq, amp, decay }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx % 3 === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, strikeTime);

          gain.gain.setValueAtTime(0.001, strikeTime);
          gain.gain.linearRampToValueAtTime(amp, strikeTime + 0.003);
          gain.gain.exponentialRampToValueAtTime(0.0006, strikeTime + decay);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(strikeTime);
          osc.stop(strikeTime + decay + 0.01);
        });
      }
    } catch {
      // Ignore
    }
  }

  // Authentic Looping "Waiting Courage Computer" Sound while waiting for results
  public startWaitingCourageSound(): () => void {
    this.stopWaitingSound();
    if (this.isMuted) {
      return () => {};
    }

    try {
      const ctx = this.getContext();
      let stopped = false;

      const pattern = [
        { f: 587.33, type: 'square' as OscillatorType, dur: 0.055 },
        { f: 880.0, type: 'square' as OscillatorType, dur: 0.055 },
        { f: 1174.66, type: 'triangle' as OscillatorType, dur: 0.055 },
        { f: 783.99, type: 'square' as OscillatorType, dur: 0.055 },
        { f: 1567.98, type: 'sine' as OscillatorType, dur: 0.065 },
        { f: 659.25, type: 'square' as OscillatorType, dur: 0.055 },
        { f: 1318.51, type: 'triangle' as OscillatorType, dur: 0.055 },
        { f: 440.0, type: 'sawtooth' as OscillatorType, dur: 0.045 },
        { f: 1760.0, type: 'square' as OscillatorType, dur: 0.055 },
        { f: 987.77, type: 'triangle' as OscillatorType, dur: 0.055 },
        { f: 2093.0, type: 'sine' as OscillatorType, dur: 0.055 },
        { f: 330.0, type: 'sawtooth' as OscillatorType, dur: 0.045 },
      ];

      let stepIdx = 0;

      const playStep = () => {
        if (stopped || this.isMuted) return;
        try {
          if (ctx.state !== 'running') return;
          const now = ctx.currentTime;
          const note = pattern[stepIdx % pattern.length];
          stepIdx++;

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = note.type;
          osc.frequency.setValueAtTime(note.f, now);

          if (stepIdx % 4 === 0) {
            osc.frequency.exponentialRampToValueAtTime(note.f * 1.25, now + note.dur);
          }

          gain.gain.setValueAtTime(0.032, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + note.dur + 0.005);
        } catch {
          // Ignore
        }
      };

      playStep();
      const intervalId = setInterval(playStep, 82);

      const stopFn = () => {
        if (stopped) return;
        stopped = true;
        clearInterval(intervalId);
      };

      this.activeWaitingLoopStop = stopFn;
      return stopFn;
    } catch {
      return () => {};
    }
  }

  public stopWaitingSound() {
    if (this.activeWaitingLoopStop) {
      this.activeWaitingLoopStop();
      this.activeWaitingLoopStop = null;
    }
  }

  public stopVoice() {
    this.playbackCancelled = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.typewriterTimer !== null) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    if (this.activeVoiceSource) {
      try {
        this.activeVoiceSource.stop();
        this.activeVoiceSource.disconnect();
      } catch {
        // Ignore
      }
      this.activeVoiceSource = null;
    }
    if (this.activeHtmlAudio) {
      try {
        this.activeHtmlAudio.pause();
        this.activeHtmlAudio.src = '';
      } catch {
        // Ignore
      }
      this.activeHtmlAudio = null;
    }
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Ignore
    }
  }

  private speakBritishBrowserFallback(text: string, rate = 0.89): void {
    if (this.isMuted) return;
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const cleanSpeech = text
        .replace(/:\)/g, '')
        .replace(/\.{2,}/g, ', ')
        .replace(/\n+/g, '. ')
        .trim();
      if (!cleanSpeech) return;

      const utter = new SpeechSynthesisUtterance(cleanSpeech);
      utter.lang = 'en-GB';
      utter.rate = rate;
      utter.pitch = 0.88;

      const voices = window.speechSynthesis.getVoices();
      const britishVoice =
        voices.find(
          (v) =>
            /en[-_]GB/i.test(v.lang) &&
            /(male|daniel|arthur|oliver|george|ryan|uk english male)/i.test(v.name)
        ) ||
        voices.find((v) => /en[-_]GB/i.test(v.lang)) ||
        voices.find((v) => /en/i.test(v.lang));
      if (britishVoice) {
        utter.voice = britishVoice;
      }
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis errors
    }
  }

  public runQuickTypewriter(
    text: string,
    stepMs: number,
    onUpdate: (current: string) => void,
    onDone?: () => void
  ) {
    if (this.typewriterTimer !== null) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    const upper = text.toUpperCase();
    let i = 0;
    onUpdate('');
    this.typewriterTimer = setInterval(() => {
      i++;
      if (i <= upper.length) {
        onUpdate(upper.slice(0, i));
        if (upper[i - 1] !== ' ' && upper[i - 1] !== '\n') {
          this.playTypewriterTick();
        }
      } else {
        if (this.typewriterTimer) {
          clearInterval(this.typewriterTimer);
          this.typewriterTimer = null;
        }
        onDone?.();
      }
    }, stepMs);
  }

  public async decodeAudioWithEnvelope(
    audioBase64: string | null,
    cacheKey?: string
  ): Promise<{ buffer: AudioBuffer | null; envelope: SpeechEnvelope | null }> {
    if (!audioBase64) return { buffer: null, envelope: null };
    if (cacheKey && this.decodedCache.has(cacheKey)) {
      const hit = this.decodedCache.get(cacheKey)!;
      return { buffer: hit.buffer, envelope: hit.envelope };
    }
    try {
      const ctx = this.getContext();
      const binaryString = window.atob(audioBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const envelope = analyzeAudioBufferEnvelope(buffer);
      if (cacheKey) {
        this.decodedCache.set(cacheKey, { buffer, envelope });
      }
      return { buffer, envelope };
    } catch {
      return { buffer: null, envelope: null };
    }
  }

  public async decodeAudioBase64(audioBase64: string | null): Promise<AudioBuffer | null> {
    const { buffer } = await this.decodeAudioWithEnvelope(audioBase64);
    return buffer;
  }

  private playSingleDecodedSlide(
    slide: DecodedSlide,
    onRender: (state: ActiveSlideRender) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (this.playbackCancelled) {
        resolve();
        return;
      }

      const normalizedText = formatNumberedListText(slide.text || 'YOU TWIT.');
      const fullUpperText = normalizedText.toUpperCase();
      let lastTyped = '';

      const emitAtProgress = (progress: number) => {
        const typed = sliceBySpeechProgress(fullUpperText, progress);
        if (typed !== lastTyped) {
          lastTyped = typed;
          onRender({
            style: slide.style,
            typedText: typed,
            fullText: fullUpperText,
            boxTitle: slide.boxTitle,
            compareLeft: slide.compareLeft,
            compareRight: slide.compareRight,
            compareLeftImageUrl: slide.compareLeftImageUrl,
            compareRightImageUrl: slide.compareRightImageUrl,
            visualSubject: slide.visualSubject,
            visualImageUrl: slide.visualImageUrl,
          });
        }
      };

      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const envelope =
        slide.envelope ||
        (slide.audioBuffer ? analyzeAudioBufferEnvelope(slide.audioBuffer) : null);

      // Context-dependent show talking speed & post-slide dramatic pause!
      const { playbackRate, postSlidePauseMs } = getContextualSpeechPace(slide);

      // 1. Primary Path: Web Audio API with Context-Aware Show Cadence & 1:1 Playhead Waveform Sync
      if (slide.audioBuffer && envelope && !this.isMuted && ctx.state === 'running') {
        try {
          const source = ctx.createBufferSource();
          source.buffer = slide.audioBuffer;
          source.playbackRate.value = playbackRate;
          this.activeVoiceSource = source;
          source.connect(ctx.destination);

          const trimStart = envelope.trimStartSec;
          const totalWallDurationSec =
            Math.max(0.25, slide.audioBuffer.duration - trimStart) / playbackRate;
          const startTime = ctx.currentTime;

          emitAtProgress(0.01);

          const tick = () => {
            if (this.playbackCancelled) {
              resolve();
              return;
            }
            const wallElapsedSec = ctx.currentTime - startTime;
            // Exact playhead offset inside the audio buffer scaled by playbackRate
            const bufferElapsedSec = wallElapsedSec * playbackRate;
            const progress = getEnvelopeSpeechProgress(envelope, bufferElapsedSec);
            emitAtProgress(progress);

            if (wallElapsedSec < totalWallDurationSec) {
              this.rafId = requestAnimationFrame(tick);
            }
          };

          source.onended = () => {
            if (this.rafId !== null) {
              cancelAnimationFrame(this.rafId);
              this.rafId = null;
            }
            emitAtProgress(1);
            setTimeout(resolve, postSlidePauseMs);
          };

          source.start(0, trimStart);
          this.rafId = requestAnimationFrame(tick);
          return;
        } catch {
          // Fall through to fallback
        }
      }

      // 2. If running without a decoded buffer, use British speech fallback at context rate
      if (!slide.audioBuffer && !slide.audioBase64 && !this.isMuted) {
        this.speakBritishBrowserFallback(normalizedText, playbackRate);
      }

      // 3. Wall-clock + Mid-Slide Audio Unlock Path (for mobile boot before first screen touch)
      let audioStartedMidSlide = false;
      const trimStart = envelope ? envelope.trimStartSec : 0;
      const durationMs = envelope
        ? Math.max(1150, (envelope.effectiveDurationSec / playbackRate) * 1000)
        : slide.audioBuffer
        ? Math.max(1300, (slide.audioBuffer.duration / playbackRate) * 1000)
        : Math.max(1750, fullUpperText.length * 58);
      const started = performance.now();

      emitAtProgress(0.01);

      const interval = setInterval(() => {
        if (this.playbackCancelled) {
          clearInterval(interval);
          resolve();
          return;
        }

        const wallElapsedMs = performance.now() - started;
        const wallElapsedSec = wallElapsedMs / 1000;
        const bufferElapsedSec = wallElapsedSec * playbackRate;

        // If user taps the screen during boot, immediately unlock and start the Fish Audio voice at the exact playhead!
        if (!audioStartedMidSlide && slide.audioBuffer && !this.isMuted && ctx.state === 'running') {
          audioStartedMidSlide = true;
          try {
            const source = ctx.createBufferSource();
            source.buffer = slide.audioBuffer;
            source.playbackRate.value = playbackRate;
            this.activeVoiceSource = source;
            source.connect(ctx.destination);
            const offsetSec = Math.min(
              slide.audioBuffer.duration - 0.05,
              Math.max(0, trimStart + bufferElapsedSec)
            );
            source.start(0, offsetSec);
          } catch {
            // Ignore
          }
        }

        const progress = envelope
          ? getEnvelopeSpeechProgress(envelope, bufferElapsedSec)
          : Math.min(1, wallElapsedMs / durationMs);

        emitAtProgress(progress);
        if (wallElapsedMs >= durationMs) {
          clearInterval(interval);
          emitAtProgress(1);
          setTimeout(resolve, postSlidePauseMs);
        }
      }, 20);
    });
  }

  public async playSlidePromisesSequentially(
    slidePromises: Array<Promise<DecodedSlide>>,
    callbacks: {
      onSlideRender: (state: ActiveSlideRender) => void;
      onAllComplete: (resolvedSlides: DecodedSlide[]) => void;
    }
  ) {
    this.stopWaitingSound();
    this.stopVoice();
    this.playbackCancelled = false;

    const resolvedSlides: DecodedSlide[] = [];

    for (let i = 0; i < slidePromises.length; i++) {
      if (this.playbackCancelled) break;
      const decodedSlide = await slidePromises[i];
      resolvedSlides.push(decodedSlide);
      if (this.playbackCancelled) break;
      await this.playSingleDecodedSlide(decodedSlide, callbacks.onSlideRender);
    }

    if (!this.playbackCancelled) {
      callbacks.onAllComplete(resolvedSlides);
    }
  }
}

export const soundEngine = new RetroSoundEngine();

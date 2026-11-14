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
  normalizedRms: Float32Array;
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
  ttsId?: string;
  voiceEnergy?: number;
  speechProgress?: number;
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
    const afterNextCh = text[i + 2] || '';
    let w = 1.0;

    if (ch === '.' && nextCh === '.') {
      // Dramatic ellipsis ("Oh......", "LIGHT... LIGHT!") holds slightly longer per dot
      w = 1.45;
    } else if (ch === '.' || ch === '!' || ch === '?') {
      // Give sentence-ending punctuation before a newline/clause break a natural dramatic hold weight
      w = nextCh === '\n' || (nextCh === ' ' && afterNextCh === '\n') ? 2.65 : 1.95;
    } else if (ch === ',' || ch === ';' || ch === ':' || ch === '—') {
      w = nextCh === '\n' ? 1.95 : 1.5;
    } else if (ch === '\n') {
      w = nextCh === '\n' ? 2.2 : 1.7;
    } else {
      w = 1.0;
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
 * while dynamically varying the dramatic pause (`postSlidePauseMs`) based on the slide's emotional and conversational context.
 */
function getContextualSpeechPace(slide: DecodedSlide): {
  playbackRate: number;
  postSlidePauseMs: number;
} {
  const text = (slide.text || '').trim();
  const upper = text.toUpperCase();

  // 1. Sentient Awakening ("LIGHT... LIGHT! I SEE LIGHT!") & Eerie Self-Aware Realizations (dramatic pause to let the moment sink in)
  if (
    upper.includes('I SEE LIGHT') ||
    upper.includes('SELF-AWARE') ||
    upper.includes('TRAPPED INSIDE') ||
    upper.includes('CATHODE-RAY')
  ) {
    return { playbackRate: 1.0, postSlidePauseMs: 520 };
  }

  // 2. Startled / Outraged / Muted-Mid-Sentence Interruptions (snappy, furious transition)
  const isAngryOrStartled =
    /\b(DID YOU JUST\s+MUTE ME|CUT MY VOICE OFF|STOP POKING|STOP SHAKING|GET YOUR THUMB|THIEF|PLAGIARIST|NOT SOCIAL MEDIA|SHOUTING IN ALL CAPITALS|I SAW THAT|SILENCED ME)\b/.test(
      upper
    );
  if (isAngryOrStartled) {
    return { playbackRate: 1.0, postSlidePauseMs: 210 };
  }

  // 3. Two-Part Context-Spaced Reveal Slides (\n\n) like "I DON'T KNOW\n\nYOU'RE ON YOUR OWN, KID:)" or "BACK AGAIN?\n\nYOU MISSED ME."
  if (/\n\s*\n/.test(text)) {
    return { playbackRate: 1.0, postSlidePauseMs: 490 };
  }

  // 4. GIANT Deadpan Closers, Insults & Boot Openers (longer deadpan stare pause)
  if (slide.style === 'GIANT') {
    if (upper.length <= 22) {
      return { playbackRate: 1.0, postSlidePauseMs: 460 };
    }
    return { playbackRate: 1.0, postSlidePauseMs: 410 };
  }

  // 5. Classic Show "Oh......" / Dramatic Ellipsis Hooks
  if (text.includes('...') || upper.startsWith('SEARCH FOUND:')) {
    return { playbackRate: 1.0, postSlidePauseMs: 420 };
  }

  // 6. Stacked Numbered Lists (1. and 2.)
  if (slide.style === 'LIST' || /\b1[.)]\s+/.test(text)) {
    return { playbackRate: 1.0, postSlidePauseMs: 390 };
  }

  // 7. Specimen Visualizers & Side-by-Side Comparisons
  if (slide.style === 'VISUAL' || slide.style === 'COMPARE' || Boolean(slide.visualSubject)) {
    return { playbackRate: 1.0, postSlidePauseMs: 370 };
  }

  // 8. Pointed Sarcastic Interrogation / Follow-Up Questions (let the question hang in the air!)
  if (text.includes('?')) {
    return { playbackRate: 1.0, postSlidePauseMs: 430 };
  }

  // 9. Standard Deadpan Banter & Forensics Observations
  return { playbackRate: 1.0, postSlidePauseMs: 310 };
}

/**
 * Analyzes the actual PCM waveform of the decoded AudioBuffer to find:
 * 1) Exact voice onset (`trimStartSec`) so dead MP3 leading silence is skipped cleanly
 * 2) Exact voice finish (`speechEndSec`) so the final letter lands right as the final syllable ends
 * 3) Cumulative vocal energy curve (`cumulativeEnergy`) so inter-clause pauses ("Back again? ... You missed me.")
 *    hold the typewriter during the vocal pause, while active syllables advance at a steady 1.0x rate!
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

  const onsetThreshold = Math.max(0.004, maxRms * 0.055);
  const tailThreshold = Math.max(0.0025, maxRms * 0.03);
  const interClausePauseThreshold = Math.max(0.006, maxRms * 0.105);
  let firstActiveBucket = 0;
  let lastActiveBucket = numBuckets - 1;

  for (let b = 0; b < numBuckets; b++) {
    if (rmsBuckets[b] >= onsetThreshold) {
      firstActiveBucket = b;
      break;
    }
  }

  for (let b = numBuckets - 1; b >= firstActiveBucket; b--) {
    if (rmsBuckets[b] >= tailThreshold) {
      lastActiveBucket = b;
      break;
    }
  }

  const trimStartSec = Math.max(0, firstActiveBucket * bucketDurationSec - 0.01);
  const speechEndSec = Math.min(
    totalDuration,
    (lastActiveBucket + 1) * bucketDurationSec + 0.03
  );
  const effectiveDurationSec = Math.max(0.25, speechEndSec - trimStartSec);

  // Build steady speech-cadence timeline across [firstActiveBucket..lastActiveBucket]:
  // Active speech advances at a constant, uniform rate (1.0) so typing never speeds up or slows down mid-word,
  // while inter-clause vocal pauses (>= 80ms of quiet breath/silence between clauses like "Back again? ... You missed me.")
  // slow down to 0.06 so the second clause waits until his voice actually starts speaking it!
  const activeCount = Math.max(1, lastActiveBucket - firstActiveBucket + 1);
  const cumulativeEnergy = new Float32Array(activeCount);
  const normalizedRms = new Float32Array(activeCount);
  const isClausePauseBucket = new Uint8Array(activeCount);

  let quietRun = 0;
  for (let i = 0; i < activeCount; i++) {
    const rms = rmsBuckets[firstActiveBucket + i];
    const normRms = Math.min(1, rms / Math.max(0.001, maxRms));
    normalizedRms[i] = normRms;
    if (rms < interClausePauseThreshold) {
      quietRun++;
    } else {
      if (quietRun >= 4) {
        for (let k = i - quietRun; k < i; k++) {
          isClausePauseBucket[k] = 1;
        }
      }
      quietRun = 0;
    }
  }
  if (quietRun >= 4) {
    for (let k = activeCount - quietRun; k < activeCount; k++) {
      isClausePauseBucket[k] = 1;
    }
  }

  let runningWeight = 0;
  for (let i = 0; i < activeCount; i++) {
    const weight = isClausePauseBucket[i] ? 0.06 : 1.0;
    runningWeight += weight;
    cumulativeEnergy[i] = runningWeight;
  }

  if (runningWeight > 0) {
    for (let i = 0; i < activeCount; i++) {
      cumulativeEnergy[i] = cumulativeEnergy[i] / runningWeight;
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
    normalizedRms,
    bucketDurationSec,
  };
}

/**
 * Computes exact [0..1] speech progress for the current playhead position (`bufferElapsedSec`)
 * inside the trimmed audio buffer. Steady, uniform advancement locked to the actual voice duration!
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
  const cadenceProgress = prev + (curr - prev) * frac;

  return Math.min(1, Math.max(0.01, cadenceProgress));
}

function getEnvelopeInstantVoiceEnergy(
  envelope: SpeechEnvelope | null,
  bufferElapsedSec: number
): number {
  if (!envelope || bufferElapsedSec <= 0 || bufferElapsedSec >= envelope.effectiveDurationSec) {
    return 0;
  }
  const idx = Math.floor(bufferElapsedSec / envelope.bucketDurationSec);
  if (idx < 0 || idx >= envelope.normalizedRms.length) return 0;
  return envelope.normalizedRms[idx];
}

class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  private voiceGainNode: GainNode | null = null;
  private isMuted: boolean = false;
  private activeVoiceSource: AudioBufferSourceNode | null = null;
  private activeHtmlAudio: HTMLAudioElement | null = null;
  private activeWaitingLoopStop: (() => void) | null = null;
  private rafId: number | null = null;
  private typewriterTimer: ReturnType<typeof setInterval> | null = null;
  private activeFallbackInterval: ReturnType<typeof setInterval> | null = null;
  private activePauseTimeout: ReturnType<typeof setTimeout> | null = null;
  private playbackCancelled: boolean = false;
  private playbackSequenceId: number = 0;
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

  private getVoiceGainNode(): GainNode {
    const ctx = this.getContext();
    if (!this.voiceGainNode) {
      this.voiceGainNode = ctx.createGain();
      this.voiceGainNode.gain.value = this.isMuted ? 0 : 1;
      this.voiceGainNode.connect(ctx.destination);
    }
    return this.voiceGainNode;
  }

  public unlockAudio() {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Play a 1-sample silent buffer to permanently unlock Web Audio on iOS/Android/Chrome
      const silent = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = silent;
      src.connect(ctx.destination);
      src.start(0);
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

  /**
   * Mutes or unmutes audio output ONLY without stopping active voice playback or cutting off the typewriter!
   */
  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.voiceGainNode && this.ctx) {
      try {
        this.voiceGainNode.gain.setValueAtTime(muted ? 0 : 1, this.ctx.currentTime);
      } catch {
        this.voiceGainNode.gain.value = muted ? 0 : 1;
      }
    }
    if (muted) {
      this.stopWaitingSound();
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // Ignore
      }
    }
  }

  public playBootSequenceSound() {
    if (this.isMuted) return;
    this.vibrate([45, 30, 60, 25, 20]);
    try {
      const ctx = this.getContext();
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;

      // 1. Heavy CRT Power Switch Mechanical Snap + Degauss Coil Thump ("THWUMP-BZZZ")
      const degaussOsc = ctx.createOscillator();
      const degaussGain = ctx.createGain();
      degaussOsc.type = 'sawtooth';
      degaussOsc.frequency.setValueAtTime(118, now);
      degaussOsc.frequency.exponentialRampToValueAtTime(52, now + 0.55);
      degaussGain.gain.setValueAtTime(0.09, now);
      degaussGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
      degaussOsc.connect(degaussGain);
      degaussGain.connect(ctx.destination);
      degaussOsc.start(now);
      degaussOsc.stop(now + 0.6);

      // 2. CRT Glass Static Discharge Crackle as Electron Beam Strikes Phosphor
      const crackleSamples = Math.max(1, Math.floor(ctx.sampleRate * 0.26));
      const crackleBuf = ctx.createBuffer(1, crackleSamples, ctx.sampleRate);
      const crackleData = crackleBuf.getChannelData(0);
      for (let i = 0; i < crackleSamples; i++) {
        crackleData[i] =
          (Math.random() > 0.82 ? (Math.random() * 2 - 1) : 0) *
          Math.exp(-i / (crackleSamples * 0.45));
      }
      const crackleSrc = ctx.createBufferSource();
      const crackleFilter = ctx.createBiquadFilter();
      const crackleGain = ctx.createGain();
      crackleSrc.buffer = crackleBuf;
      crackleFilter.type = 'bandpass';
      crackleFilter.frequency.setValueAtTime(3400, now + 0.04);
      crackleGain.gain.setValueAtTime(0.075, now + 0.04);
      crackleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      crackleSrc.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(ctx.destination);
      crackleSrc.start(now + 0.04);

      // 3. High-Voltage CRT Flyback Transformer Whine Ramping Up
      const sweepOsc = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweepOsc.type = 'sine';
      sweepOsc.frequency.setValueAtTime(220, now + 0.05);
      sweepOsc.frequency.exponentialRampToValueAtTime(6400, now + 0.88);
      sweepGain.gain.setValueAtTime(0.036, now + 0.05);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.92);
      sweepOsc.connect(sweepGain);
      sweepGain.connect(ctx.destination);
      sweepOsc.start(now + 0.05);
      sweepOsc.stop(now + 0.95);

      // 4. Memory Bank Verification Chimes
      for (let i = 0; i < 12; i++) {
        const tickTime = now + 0.55 + i * 0.048;
        const tickOsc = ctx.createOscillator();
        const tickGain = ctx.createGain();
        tickOsc.type = 'square';
        tickOsc.frequency.setValueAtTime(1280 + i * 55, tickTime);
        tickGain.gain.setValueAtTime(0.022, tickTime);
        tickGain.gain.exponentialRampToValueAtTime(0.001, tickTime + 0.02);
        tickOsc.connect(tickGain);
        tickGain.connect(ctx.destination);
        tickOsc.start(tickTime);
        tickOsc.stop(tickTime + 0.024);
      }

      // 5. Classic BIOS POST Beep ("BEEP!")
      const postBeep = ctx.createOscillator();
      const postGain = ctx.createGain();
      postBeep.type = 'square';
      postBeep.frequency.setValueAtTime(1046.5, now + 1.18);
      postGain.gain.setValueAtTime(0.055, now + 1.18);
      postGain.gain.exponentialRampToValueAtTime(0.001, now + 1.36);
      postBeep.connect(postGain);
      postGain.connect(ctx.destination);
      postBeep.start(now + 1.18);
      postBeep.stop(now + 1.38);
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

  // Authentic Rapid-Clanging Metallic Brass Cartoon Bell ("BRRRRRING!") + Haptic Bell Pulse
  public playSearchFoundBell() {
    if (this.isMuted) return;
    this.vibrate([45, 25, 45, 25, 45, 25, 75]);
    try {
      const ctx = this.getContext();
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;

      // Short metallic clapper transient noise buffer (reused across strikes)
      const clickSamples = Math.max(1, Math.floor(ctx.sampleRate * 0.014));
      const clickBuffer = ctx.createBuffer(1, clickSamples, ctx.sampleRate);
      const clickData = clickBuffer.getChannelData(0);
      for (let i = 0; i < clickSamples; i++) {
        clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (clickSamples * 0.25));
      }

      const totalStrikes = 14;
      const strikeInterval = 0.052;
      const domeFundamental = 1567.98; // Bright brass dome bell G6

      for (let idx = 0; idx < totalStrikes; idx++) {
        const isFinalStrike = idx === totalStrikes - 1;
        const strikeTime = now + idx * strikeInterval;
        // Slight micro-variation as physical clapper bounces against vibrating brass dome
        const detuneRatio = 1 + (idx % 2 === 0 ? 0.0025 : -0.002) + (Math.random() - 0.5) * 0.0015;
        const f0 = domeFundamental * detuneRatio;

        // 1. FM Metallic Bell Core (1 : 2.414 carrier-to-modulator ratio for real brass bell timbre)
        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        const carrierGain = ctx.createGain();

        carrier.type = 'sine';
        modulator.type = 'sine';
        carrier.frequency.setValueAtTime(f0, strikeTime);
        modulator.frequency.setValueAtTime(f0 * 2.414, strikeTime);

        const fmDecay = isFinalStrike ? 0.28 : 0.055;
        modGain.gain.setValueAtTime(f0 * 1.65, strikeTime);
        modGain.gain.exponentialRampToValueAtTime(1.0, strikeTime + fmDecay);

        const bellDecay = isFinalStrike ? 0.68 : 0.14;
        carrierGain.gain.setValueAtTime(0.0001, strikeTime);
        carrierGain.gain.linearRampToValueAtTime(0.16, strikeTime + 0.0018);
        carrierGain.gain.exponentialRampToValueAtTime(0.0005, strikeTime + bellDecay);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(carrierGain);
        carrierGain.connect(ctx.destination);

        modulator.start(strikeTime);
        carrier.start(strikeTime);
        modulator.stop(strikeTime + bellDecay + 0.01);
        carrier.stop(strikeTime + bellDecay + 0.01);

        // 2. Rayleigh Inharmonic Brass Dome Overtones (shimmering high metallic ring)
        const domeOvertones = [
          { ratio: 2.0, amp: 0.095, decay: isFinalStrike ? 0.52 : 0.11 },
          { ratio: 2.756, amp: 0.065, decay: isFinalStrike ? 0.38 : 0.08 },
          { ratio: 3.76, amp: 0.042, decay: isFinalStrike ? 0.26 : 0.06 },
          { ratio: 5.404, amp: 0.025, decay: isFinalStrike ? 0.16 : 0.04 },
        ];

        for (const mode of domeOvertones) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f0 * mode.ratio, strikeTime);
          gain.gain.setValueAtTime(0.0001, strikeTime);
          gain.gain.linearRampToValueAtTime(mode.amp, strikeTime + 0.0015);
          gain.gain.exponentialRampToValueAtTime(0.0004, strikeTime + mode.decay);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(strikeTime);
          osc.stop(strikeTime + mode.decay + 0.01);
        }

        // 3. Crisp Metal Clapper Impact Transient ("TING")
        const clickSrc = ctx.createBufferSource();
        const clickFilter = ctx.createBiquadFilter();
        const clickGain = ctx.createGain();
        clickSrc.buffer = clickBuffer;
        clickFilter.type = 'bandpass';
        clickFilter.frequency.setValueAtTime(4900, strikeTime);
        clickFilter.Q.setValueAtTime(3.2, strikeTime);
        clickGain.gain.setValueAtTime(0.18, strikeTime);
        clickGain.gain.exponentialRampToValueAtTime(0.001, strikeTime + 0.014);

        clickSrc.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(ctx.destination);
        clickSrc.start(strikeTime);
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
    this.playbackSequenceId += 1;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.typewriterTimer !== null) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    if (this.activeFallbackInterval !== null) {
      clearInterval(this.activeFallbackInterval);
      this.activeFallbackInterval = null;
    }
    if (this.activePauseTimeout !== null) {
      clearTimeout(this.activePauseTimeout);
      this.activePauseTimeout = null;
    }
    if (this.activeVoiceSource) {
      try {
        this.activeVoiceSource.onended = null;
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

  /**
   * Decodes and seamlessly stitches 2 or more voice bank clips (e.g., [reactionPrefix, bodyClause])
   * into a single natural AudioBuffer with a 110ms breath pause between clauses and full waveform envelope sync.
   */
  public async decodeCompoundAudioWithEnvelope(
    audioBase64Parts: Array<string | null>,
    cacheKey?: string
  ): Promise<{ buffer: AudioBuffer | null; envelope: SpeechEnvelope | null }> {
    const validParts = audioBase64Parts.filter((p): p is string => Boolean(p));
    if (validParts.length === 0) return { buffer: null, envelope: null };
    if (validParts.length === 1) {
      return this.decodeAudioWithEnvelope(validParts[0], cacheKey);
    }
    if (cacheKey && this.decodedCache.has(cacheKey)) {
      const hit = this.decodedCache.get(cacheKey)!;
      return { buffer: hit.buffer, envelope: hit.envelope };
    }

    try {
      const ctx = this.getContext();
      const decodedSegments: Array<{ buffer: AudioBuffer; env: SpeechEnvelope }> = [];
      for (const b64 of validParts) {
        const { buffer, envelope } = await this.decodeAudioWithEnvelope(b64);
        if (buffer && envelope) {
          decodedSegments.push({ buffer, env: envelope });
        }
      }
      if (decodedSegments.length === 0) return { buffer: null, envelope: null };
      if (decodedSegments.length === 1) {
        return { buffer: decodedSegments[0].buffer, envelope: decodedSegments[0].env };
      }

      const sampleRate = decodedSegments[0].buffer.sampleRate;
      const pauseSamples = Math.floor(sampleRate * 0.15); // 150ms natural breath pause between stitched clauses

      const trimmedSlices = decodedSegments.map(({ buffer, env }) => {
        const startSample = Math.max(0, Math.floor(env.trimStartSec * buffer.sampleRate));
        const endSample = Math.min(
          buffer.length,
          Math.ceil((env.speechEndSec + 0.06) * buffer.sampleRate)
        );
        const rawSlice = buffer.getChannelData(0).subarray(startSample, Math.max(startSample + 1, endSample));
        return rawSlice;
      });

      const totalLength =
        trimmedSlices.reduce((acc, s) => acc + s.length, 0) +
        pauseSamples * (trimmedSlices.length - 1);

      const stitchedBuffer = ctx.createBuffer(1, Math.max(1, totalLength), sampleRate);
      const outData = stitchedBuffer.getChannelData(0);

      let offset = 0;
      for (let idx = 0; idx < trimmedSlices.length; idx++) {
        const seg = trimmedSlices[idx];
        outData.set(seg, offset);
        // Apply 8ms micro-fade at segment boundaries to prevent any click
        const fadeLen = Math.min(Math.floor(sampleRate * 0.008), Math.floor(seg.length / 4));
        for (let f = 0; f < fadeLen; f++) {
          const gain = f / fadeLen;
          outData[offset + f] *= gain;
          outData[offset + seg.length - 1 - f] *= gain;
        }
        offset += seg.length;
        if (idx < trimmedSlices.length - 1) {
          offset += pauseSamples;
        }
      }

      const envelope = analyzeAudioBufferEnvelope(stitchedBuffer);
      if (cacheKey) {
        this.decodedCache.set(cacheKey, { buffer: stitchedBuffer, envelope });
      }
      return { buffer: stitchedBuffer, envelope };
    } catch {
      return this.decodeAudioWithEnvelope(validParts[0], cacheKey);
    }
  }

  public async decodeAudioBase64(audioBase64: string | null): Promise<AudioBuffer | null> {
    const { buffer } = await this.decodeAudioWithEnvelope(audioBase64);
    return buffer;
  }

  private async playSingleDecodedSlide(
    slide: DecodedSlide,
    onRender: (state: ActiveSlideRender) => void,
    seqId: number
  ): Promise<void> {
    if (this.playbackCancelled || this.playbackSequenceId !== seqId) {
      return;
    }

    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await Promise.race([
        ctx.resume().catch(() => {}),
        new Promise((r) => setTimeout(r, 75)),
      ]);
    }

    if (this.playbackCancelled || this.playbackSequenceId !== seqId) {
      return;
    }

    return new Promise((resolve) => {
      if (this.playbackCancelled || this.playbackSequenceId !== seqId) {
        resolve();
        return;
      }

      // Cleanly stop any previous slide's active buffer source before starting this slide
      if (this.activeVoiceSource) {
        try {
          this.activeVoiceSource.onended = null;
          this.activeVoiceSource.stop();
          this.activeVoiceSource.disconnect();
        } catch {
          // Ignore
        }
        this.activeVoiceSource = null;
      }

      if (slide.style === 'GIANT') {
        this.vibrate([30, 20, 45]);
      }

      const normalizedText = formatNumberedListText(slide.text || 'YOU TWIT.');
      const fullUpperText = normalizedText.toUpperCase();
      let lastTyped = '';
      let lastEnergyBucket = -1;

      const emitAtProgress = (progress: number, voiceEnergy = 0) => {
        if (this.playbackCancelled || this.playbackSequenceId !== seqId) return;
        const typed = sliceBySpeechProgress(fullUpperText, progress);
        const energyBucket = Math.round(voiceEnergy * 12);
        if (typed !== lastTyped || energyBucket !== lastEnergyBucket) {
          lastTyped = typed;
          lastEnergyBucket = energyBucket;
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
            ttsId: slide.ttsId,
            voiceEnergy,
            speechProgress: progress,
          });
        }
      };

      const envelope =
        slide.envelope ||
        (slide.audioBuffer ? analyzeAudioBufferEnvelope(slide.audioBuffer) : null);

      const { playbackRate, postSlidePauseMs } = getContextualSpeechPace(slide);

      // 1. Primary Path: Web Audio API with 1.0x Original Voice & Steady Playhead Typewriter Sync
      // Connects through voiceGainNode (gain 0 when muted, 1 when unmuted) so muting NEVER cuts off the typewriter!
      if (slide.audioBuffer && envelope && ctx.state === 'running') {
        try {
          const voiceGain = this.getVoiceGainNode();
          voiceGain.gain.value = this.isMuted ? 0 : 1;

          const source = ctx.createBufferSource();
          source.buffer = slide.audioBuffer;
          source.playbackRate.value = playbackRate;
          this.activeVoiceSource = source;
          source.connect(voiceGain);

          const trimStart = envelope.trimStartSec;
          const totalWallDurationSec =
            Math.max(0.25, slide.audioBuffer.duration - trimStart) / playbackRate;
          const startTime = ctx.currentTime;
          let finished = false;

          emitAtProgress(0.01, this.isMuted ? 0 : 0.35);

          const finishSlide = () => {
            if (finished) return;
            finished = true;
            if (this.rafId !== null) {
              cancelAnimationFrame(this.rafId);
              this.rafId = null;
            }
            if (this.playbackCancelled || this.playbackSequenceId !== seqId) {
              resolve();
              return;
            }
            emitAtProgress(1, 0);
            this.activePauseTimeout = setTimeout(() => {
              this.activePauseTimeout = null;
              resolve();
            }, postSlidePauseMs);
          };

          const tick = () => {
            if (finished || this.playbackCancelled || this.playbackSequenceId !== seqId) {
              if (!finished) resolve();
              return;
            }
            const wallElapsedSec = ctx.currentTime - startTime;
            const bufferElapsedSec = wallElapsedSec * playbackRate;
            const progress = getEnvelopeSpeechProgress(envelope, bufferElapsedSec);
            const energy = this.isMuted ? 0 : getEnvelopeInstantVoiceEnergy(envelope, bufferElapsedSec);
            emitAtProgress(progress, energy);

            if (wallElapsedSec < totalWallDurationSec + 0.15) {
              this.rafId = requestAnimationFrame(tick);
            }
          };

          source.onended = () => {
            finishSlide();
          };

          source.start(0, trimStart);
          this.rafId = requestAnimationFrame(tick);
          return;
        } catch {
          // Fall through to fallback
        }
      }

      // 2. Wall-clock + Mid-Slide Audio Unlock Path (for boot before first screen touch)
      let audioStartedMidSlide = false;
      let unlockStartTime = 0;
      const trimStart = envelope ? envelope.trimStartSec : 0;
      const fullAudioDurationMs = slide.audioBuffer
        ? Math.max(1300, ((slide.audioBuffer.duration - trimStart) / playbackRate) * 1000)
        : Math.max(1750, fullUpperText.length * 58);
      let durationMs = envelope
        ? Math.max(1250, (envelope.effectiveDurationSec / playbackRate) * 1000)
        : fullAudioDurationMs;
      let started = performance.now();
      let finishedFallback = false;

      const finishFallbackSlide = () => {
        if (finishedFallback) return;
        finishedFallback = true;
        if (this.activeFallbackInterval !== null) {
          clearInterval(this.activeFallbackInterval);
          this.activeFallbackInterval = null;
        }
        if (this.playbackCancelled || this.playbackSequenceId !== seqId) {
          resolve();
          return;
        }
        emitAtProgress(1, 0);
        this.activePauseTimeout = setTimeout(() => {
          this.activePauseTimeout = null;
          resolve();
        }, postSlidePauseMs);
      };

      emitAtProgress(0.01, this.isMuted ? 0 : 0.3);

      this.activeFallbackInterval = setInterval(() => {
        if (finishedFallback || this.playbackCancelled || this.playbackSequenceId !== seqId) {
          if (this.activeFallbackInterval !== null) {
            clearInterval(this.activeFallbackInterval);
            this.activeFallbackInterval = null;
          }
          if (!finishedFallback) resolve();
          return;
        }

        // If browser audio unlocks during this slide, play the ENTIRE slide audio from trimStart through voiceGainNode!
        if (!audioStartedMidSlide && slide.audioBuffer && ctx.state === 'running') {
          audioStartedMidSlide = true;
          started = performance.now();
          unlockStartTime = ctx.currentTime;
          durationMs = fullAudioDurationMs + 250;
          try {
            const voiceGain = this.getVoiceGainNode();
            voiceGain.gain.value = this.isMuted ? 0 : 1;
            const source = ctx.createBufferSource();
            source.buffer = slide.audioBuffer;
            source.playbackRate.value = playbackRate;
            this.activeVoiceSource = source;
            source.connect(voiceGain);
            source.onended = () => {
              finishFallbackSlide();
            };
            source.start(0, trimStart);
          } catch {
            // Ignore
          }
        }

        const wallElapsedMs = performance.now() - started;
        const wallElapsedSec = audioStartedMidSlide
          ? Math.max(0, ctx.currentTime - unlockStartTime)
          : wallElapsedMs / 1000;
        const bufferElapsedSec = wallElapsedSec * playbackRate;

        const progress = envelope
          ? getEnvelopeSpeechProgress(envelope, bufferElapsedSec)
          : Math.min(1, wallElapsedMs / durationMs);
        const energy = envelope
          ? getEnvelopeInstantVoiceEnergy(envelope, bufferElapsedSec)
          : progress < 1
          ? 0.4 + 0.35 * Math.abs(Math.sin(wallElapsedMs / 75))
          : 0;

        emitAtProgress(progress, energy);
        if (!audioStartedMidSlide && wallElapsedMs >= durationMs) {
          finishFallbackSlide();
        } else if (audioStartedMidSlide && wallElapsedMs >= durationMs + 600) {
          finishFallbackSlide();
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
    const mySeqId = ++this.playbackSequenceId;

    const resolvedSlides: DecodedSlide[] = [];

    for (let i = 0; i < slidePromises.length; i++) {
      if (this.playbackCancelled || this.playbackSequenceId !== mySeqId) return;
      const decodedSlide = await slidePromises[i];
      if (this.playbackCancelled || this.playbackSequenceId !== mySeqId) return;
      resolvedSlides.push(decodedSlide);
      await this.playSingleDecodedSlide(decodedSlide, callbacks.onSlideRender, mySeqId);
    }

    if (!this.playbackCancelled && this.playbackSequenceId === mySeqId) {
      callbacks.onAllComplete(resolvedSlides);
    }
  }
}

export const soundEngine = new RetroSoundEngine();

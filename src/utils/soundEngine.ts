// Authentic 1999 Courage Computer Sound, Mobile Haptics & Per-Slide Locked Voice-Typewriter Engine

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

export interface DecodedSlide extends SlideSpec {
  audioBuffer: AudioBuffer | null;
  audioBase64: string | null;
  audioMimeType: string | null;
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
      w = 1.0;
    } else if (ch === '.' || ch === '!' || ch === '?') {
      w = 4.5;
    } else if (ch === ',' || ch === ';' || ch === ':') {
      w = 2.6;
    } else if (ch === '\n') {
      w = 2.2;
    } else if (ch === ' ') {
      w = 0.7;
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

class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private activeVoiceSource: AudioBufferSourceNode | null = null;
  private activeWaitingLoopStop: (() => void) | null = null;
  private rafId: number | null = null;
  private typewriterTimer: ReturnType<typeof setInterval> | null = null;
  private playbackCancelled: boolean = false;

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
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Ignore
    }
  }

  private speakBritishBrowserFallback(text: string): void {
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
      utter.rate = 1.02;
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

  public async decodeAudioBase64(audioBase64: string | null): Promise<AudioBuffer | null> {
    if (!audioBase64) return null;
    try {
      const ctx = this.getContext();
      const binaryString = window.atob(audioBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return await ctx.decodeAudioData(bytes.buffer.slice(0));
    } catch {
      return null;
    }
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

      // Only bind to AudioBufferSourceNode clock if AudioContext is actively running!
      // On mobile Android before first touch, ctx.state may be 'suspended', so falling through
      // to the wall-clock timer prevents the slide from hanging while still starting audio if unlocked!
      if (slide.audioBuffer && !this.isMuted && ctx.state === 'running') {
        try {
          const source = ctx.createBufferSource();
          source.buffer = slide.audioBuffer;
          this.activeVoiceSource = source;
          source.connect(ctx.destination);

          const duration = Math.max(0.25, slide.audioBuffer.duration);
          const startTime = ctx.currentTime;

          emitAtProgress(0.02);

          const tick = () => {
            if (this.playbackCancelled) {
              resolve();
              return;
            }
            const elapsed = ctx.currentTime - startTime;
            const progress = Math.min(1, Math.max(0, elapsed / (duration * 0.93)));
            emitAtProgress(progress);

            if (elapsed < duration) {
              this.rafId = requestAnimationFrame(tick);
            }
          };

          source.onended = () => {
            if (this.rafId !== null) {
              cancelAnimationFrame(this.rafId);
              this.rafId = null;
            }
            emitAtProgress(1);
            setTimeout(resolve, 180);
          };

          source.start(0);
          this.rafId = requestAnimationFrame(tick);
          return;
        } catch {
          // Fall through to timer fallback
        }
      }

      // If running on static GitHub Pages without server audioBuffer, speak with British Web Speech API!
      if (!slide.audioBuffer && !this.isMuted) {
        this.speakBritishBrowserFallback(normalizedText);
      }

      // Wall-clock fallback (also kicks in voice audio mid-slide if user touches the screen on mobile!)
      let audioStartedMidSlide = false;
      const durationMs = slide.audioBuffer
        ? Math.max(1200, slide.audioBuffer.duration * 1000)
        : Math.max(1750, fullUpperText.length * 56);
      const started = performance.now();

      const interval = setInterval(() => {
        if (this.playbackCancelled) {
          clearInterval(interval);
          resolve();
          return;
        }

        const elapsed = performance.now() - started;

        // If the user touches the mobile screen during the boot monologue, unlock and play the audio immediately!
        if (!audioStartedMidSlide && slide.audioBuffer && !this.isMuted && ctx.state === 'running') {
          audioStartedMidSlide = true;
          try {
            const source = ctx.createBufferSource();
            source.buffer = slide.audioBuffer;
            this.activeVoiceSource = source;
            source.connect(ctx.destination);
            const offsetSec = Math.min(
              slide.audioBuffer.duration - 0.05,
              Math.max(0, elapsed / 1000)
            );
            source.start(0, offsetSec);
          } catch {
            // Ignore
          }
        }

        const progress = Math.min(1, elapsed / (durationMs * 0.93));
        emitAtProgress(progress);
        if (elapsed >= durationMs) {
          clearInterval(interval);
          emitAtProgress(1);
          setTimeout(resolve, 220);
        }
      }, 30);
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

export interface AudioProcessorOptions {
  vadThreshold: number;
  analysisIntervalMs: number;
  adaptiveSilenceDetection: boolean;
}

export type VoiceActivityListener = (isSpeaking: boolean) => void;

export class AudioProcessor {
  private readonly options: AudioProcessorOptions;
  private analyser?: AnalyserNode;
  private dataArray?: Float32Array;
  private rafId?: number;
  private listener?: VoiceActivityListener;

  constructor(options: AudioProcessorOptions) {
    this.options = options;
  }

  async attach(stream: MediaStream, audioContext: AudioContext, listener: VoiceActivityListener): Promise<void> {
    this.listener = listener;
    const source = audioContext.createMediaStreamSource(stream);
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    source.connect(this.analyser);
    this.dataArray = new Float32Array(this.analyser.fftSize);
    this.loop();
  }

  detach(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
    this.analyser?.disconnect();
    this.analyser = undefined;
    this.dataArray = undefined;
  }

  private loop = () => {
    if (!this.analyser || !this.dataArray || !this.listener) return;

    this.analyser.getFloatTimeDomainData(this.dataArray);
    const rms = Math.sqrt(this.dataArray.reduce((sum, value) => sum + value * value, 0) / this.dataArray.length);
    const isSpeaking = rms > this.options.vadThreshold;
    this.listener(isSpeaking);

    this.rafId = requestAnimationFrame(this.loop);
  };
}

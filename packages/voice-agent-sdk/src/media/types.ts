export interface VoiceAgentMediaConstraints {
  audio: VoiceAgentAudioConstraints;
}

export type VoiceAgentAudioConstraints = Partial<MediaTrackConstraints> & {
  noiseSuppression?: boolean;
  echoCancellation?: boolean;
  autoGainControl?: boolean;
  channelCount?: number;
  sampleRate?: number;
  sampleSize?: number;
  latency?: number;
};

import type { LatencyHints, ScenarioRuntimeConfig } from '@maka/shared';

export interface VoiceAgentConfig {
  apiKey?: string;
  apiUrl: string;
  signalingUrl: string;
  orchestratorUrl: string;
  livekitUrl: string;
  defaultLatency: LatencyHints;
  reconnection: {
    retries: number;
    backoffMs: number;
  };
  rtcIceServers: RTCIceServer[];
  features: ScenarioRuntimeConfig['features'];
}

export const defaultConfig: VoiceAgentConfig = {
  apiUrl: 'https://api.openai.com/v1/realtime',
  signalingUrl: 'https://signaling.maka.internal',
  orchestratorUrl: 'https://orchestrator.maka.internal',
  livekitUrl: 'wss://livekit.maka.internal',
  defaultLatency: { idealMs: 180, maxMs: 350 },
  reconnection: {
    retries: 3,
    backoffMs: 750
  },
  rtcIceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    {
      urls: ['turn:turn.maka.internal:3478'],
      username: 'maka-sdk',
      credential: 'voice-agent'
    }
  ],
  features: {
    adaptiveSilenceDetection: true,
    autoObjectionTagging: true,
    conversationArchiving: true
  }
};

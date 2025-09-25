export type LatencyHints = {
  idealMs: number;
  maxMs: number;
};

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface VoiceProfileConfig {
  voiceProfileId: string;
  modulation: {
    speakingRate: number;
    pitch: number;
    energy: number;
  };
}

export interface ScenarioRuntimeConfig {
  scenarioId: string;
  language: string;
  fallbackLocale?: string;
  voiceProfile: VoiceProfileConfig;
  latency: LatencyHints;
  features: {
    adaptiveSilenceDetection: boolean;
    autoObjectionTagging: boolean;
    conversationArchiving: boolean;
  };
}

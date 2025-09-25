import type {
  AgentToolDefinition,
  Scenario,
  ScenarioRuntimeConfig
} from '@maka/shared';
import { validateScenario } from '@maka/shared';
import { AudioProcessor } from './audio/audio-processor';
import { defaultConfig, type VoiceAgentConfig } from './voice-agent-config';
import type { VoiceAgentMediaConstraints } from './media/types';
import { RealtimeVoiceClient } from './realtime/realtime-client';
import { ScenarioEngine } from './scenario/scenario-engine';
import { WebRTCTransport } from './webrtc/transport';
import { logger } from './utils/logger';

export interface SessionTokens {
  sessionId: string;
  realtimeToken: string;
  signalingToken: string;
}

export interface VoiceAgentClientOptions {
  scenario: Scenario;
  runtime: ScenarioRuntimeConfig;
  tools: AgentToolDefinition[];
  config?: Partial<VoiceAgentConfig>;
  mediaConstraints?: VoiceAgentMediaConstraints;
  fetchSessionTokens: () => Promise<SessionTokens>;
  onRemoteStream?: (stream: MediaStream) => void;
  onStepChange?: (stepId: string) => void;
  onScenarioComplete?: () => void;
}

type VoiceAgentState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type VoiceAgentEvents =
  | { type: 'state'; state: VoiceAgentState }
  | { type: 'voice-activity'; speaking: boolean }
  | { type: 'step'; stepId: string };

export class VoiceAgentClient extends EventTarget {
  private readonly options: VoiceAgentClientOptions;
  private config: VoiceAgentConfig;
  private scenario: Scenario;
  private state: VoiceAgentState = 'idle';
  private audioContext?: AudioContext;
  private localStream?: MediaStream;
  private transport?: WebRTCTransport;
  private audioProcessor?: AudioProcessor;
  private scenarioEngine?: ScenarioEngine;
  private realtimeClient?: RealtimeVoiceClient;
  private sessionTokens?: SessionTokens;

  constructor(options: VoiceAgentClientOptions) {
    super();
    this.options = options;
    this.config = { ...defaultConfig, ...options.config };
    this.scenario = validateScenario(options.scenario);
  }

  get currentState(): VoiceAgentState {
    return this.state;
  }

  async connect(): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'disconnected') {
      throw new Error('Agent already connecting or connected');
    }

    this.updateState('connecting');
    this.scenario = validateScenario(this.options.scenario);

    const tokens = await this.options.fetchSessionTokens();
    this.sessionTokens = tokens;

    await this.prepareAudio();
    await this.setupRealtime(tokens);
    await this.setupWebRTC(tokens);

    this.scenarioEngine = new ScenarioEngine({
      scenario: this.scenario,
      onStepChange: step => {
        this.dispatchEvent(new CustomEvent<VoiceAgentEvents>('event', { detail: { type: 'step', stepId: step.id } }));
        this.options.onStepChange?.(step.id);
      },
      onCompletion: () => {
        this.options.onScenarioComplete?.();
      }
    });
    this.scenarioEngine.start();

    this.updateState('connected');
  }

  async disconnect(): Promise<void> {
    this.updateState('disconnected');
    this.transport?.close();
    await this.realtimeClient?.close(this.sessionTokens?.sessionId ?? '');
    this.scenarioEngine?.stop();
    this.localStream?.getTracks().forEach(track => track.stop());
    this.audioProcessor?.detach();
    this.audioContext?.close();
  }

  async resume(): Promise<void> {
    if (!this.sessionTokens) {
      throw new Error('No session tokens available');
    }
    this.updateState('reconnecting');
    await this.realtimeClient?.resume(this.sessionTokens.sessionId);
    this.updateState('connected');
  }

  private async prepareAudio(): Promise<void> {
    const constraints: VoiceAgentMediaConstraints =
      this.options.mediaConstraints ?? (
        {
          audio: {
            channelCount: 1,
            sampleRate: 48000,
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true
          }
        } as VoiceAgentMediaConstraints
      );

    this.localStream = await navigator.mediaDevices.getUserMedia(constraints as MediaStreamConstraints);
    this.audioContext = new AudioContext({ sampleRate: 48000 });
    this.audioProcessor = new AudioProcessor({
      vadThreshold: 0.02,
      analysisIntervalMs: 150,
      adaptiveSilenceDetection: this.config.features.adaptiveSilenceDetection
    });
    await this.audioProcessor.attach(this.localStream, this.audioContext, speaking => {
      this.dispatchEvent(new CustomEvent<VoiceAgentEvents>('event', { detail: { type: 'voice-activity', speaking } }));
    });
  }

  private async setupRealtime(tokens: SessionTokens): Promise<void> {
    this.realtimeClient = new RealtimeVoiceClient({
      orchestratorUrl: this.config.orchestratorUrl,
      scenario: this.options.runtime,
      tools: this.options.tools
    });
    await this.realtimeClient.establishSession(tokens.sessionId, tokens.realtimeToken);
  }

  private async setupWebRTC(tokens: SessionTokens): Promise<void> {
    if (!this.localStream) {
      throw new Error('Local media stream not initialised');
    }

    this.transport = new WebRTCTransport({
      iceServers: this.config.rtcIceServers,
      mediaConstraints: this.options.mediaConstraints ?? { audio: {} },
      onIceCandidate: candidate => this.sendCandidate(tokens.sessionId, candidate, tokens.signalingToken),
      onConnectionStateChange: state => {
        if (state === 'disconnected' || state === 'failed') {
          this.updateState('reconnecting');
        }
      },
      onRemoteStream: stream => {
        this.options.onRemoteStream?.(stream);
      }
    });

    const offer = await this.transport.createOffer(this.localStream);
    const answer = await this.sendOffer(tokens.sessionId, offer, tokens.signalingToken);
    await this.transport.acceptAnswer(answer);
  }

  private async sendOffer(sessionId: string, offer: RTCSessionDescriptionInit, signalingToken: string): Promise<RTCSessionDescriptionInit> {
    const response = await fetch(`${this.config.signalingUrl}/sessions/${sessionId}/offer`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${signalingToken}`
      },
      body: JSON.stringify({ offer })
    });

    if (!response.ok) {
      throw new Error('Failed to send offer to signaling service');
    }

    const payload = (await response.json()) as { answer: RTCSessionDescriptionInit };
    return payload.answer;
  }

  private async sendCandidate(sessionId: string, candidate: RTCIceCandidateInit, signalingToken: string): Promise<void> {
    await fetch(`${this.config.signalingUrl}/sessions/${sessionId}/ice`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${signalingToken}`
      },
      body: JSON.stringify({ candidate })
    });
  }

  private updateState(state: VoiceAgentState): void {
    this.state = state;
    logger.info(`VoiceAgent state changed: ${state}`);
    this.dispatchEvent(new CustomEvent<VoiceAgentEvents>('event', { detail: { type: 'state', state } }));
  }
}

import type { VoiceAgentMediaConstraints } from '../media/types';
import { logger } from '../utils/logger';

export interface WebRTCTransportOptions {
  iceServers: RTCIceServer[];
  mediaConstraints: VoiceAgentMediaConstraints;
  onIceCandidate: (candidate: RTCIceCandidateInit) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onRemoteStream: (stream: MediaStream) => void;
}

export class WebRTCTransport {
  private peer?: RTCPeerConnection;
  private readonly options: WebRTCTransportOptions;

  constructor(options: WebRTCTransportOptions) {
    this.options = options;
  }

  async createOffer(localStream: MediaStream): Promise<RTCSessionDescriptionInit> {
    this.peer = new RTCPeerConnection({ iceServers: this.options.iceServers });
    this.registerPeerListeners();
    localStream.getTracks().forEach(track => this.peer?.addTrack(track, localStream));
    const offer = await this.peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    await this.peer.setLocalDescription(offer);
    return offer;
  }

  async acceptAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peer) {
      throw new Error('PeerConnection not initialised');
    }
    await this.peer.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peer) return;
    await this.peer.addIceCandidate(candidate);
  }

  get connectionState(): RTCPeerConnectionState | undefined {
    return this.peer?.connectionState;
  }

  close(): void {
    if (!this.peer) return;
    this.peer.getSenders().forEach(sender => sender.track?.stop());
    this.peer.close();
    this.peer = undefined;
  }

  private registerPeerListeners() {
    if (!this.peer) return;

    this.peer.addEventListener('icecandidate', event => {
      if (event.candidate) {
        this.options.onIceCandidate(event.candidate.toJSON());
      }
    });

    this.peer.addEventListener('connectionstatechange', () => {
      if (!this.peer) return;
      const state = this.peer.connectionState;
      logger.debug('Peer connection state', { state });
      this.options.onConnectionStateChange(state);
    });

    this.peer.addEventListener('track', event => {
      const stream = event.streams[0];
      if (stream) {
        this.options.onRemoteStream(stream);
      }
    });
  }
}

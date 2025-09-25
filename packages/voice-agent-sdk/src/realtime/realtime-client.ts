import type { ScenarioRuntimeConfig, AgentToolDefinition } from '@maka/shared';
import { logger } from '../utils/logger';

export interface RealtimeVoiceClientOptions {
  orchestratorUrl: string;
  scenario: ScenarioRuntimeConfig;
  tools: AgentToolDefinition[];
  fetcher?: typeof fetch;
}

export class RealtimeVoiceClient {
  private readonly options: RealtimeVoiceClientOptions;

  constructor(options: RealtimeVoiceClientOptions) {
    this.options = {
      fetcher: typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined,
      ...options
    };
  }

  async establishSession(sessionId: string, realtimeToken: string): Promise<void> {
    if (!this.options.fetcher) {
      throw new Error('Fetch API not available in this environment');
    }

    logger.info('Configuring realtime orchestrator session', { sessionId });
    await this.options.fetcher(`${this.options.orchestratorUrl}/sessions/${sessionId}/configure`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${realtimeToken}`
      },
      body: JSON.stringify({
        scenario: this.options.scenario,
        tools: this.options.tools
      })
    });
  }

  async resume(sessionId: string): Promise<void> {
    if (!this.options.fetcher) {
      throw new Error('Fetch API not available in this environment');
    }
    await this.options.fetcher(`${this.options.orchestratorUrl}/sessions/${sessionId}/resume`, {
      method: 'POST'
    });
  }

  async close(sessionId: string): Promise<void> {
    if (!this.options.fetcher) {
      throw new Error('Fetch API not available in this environment');
    }
    await this.options.fetcher(`${this.options.orchestratorUrl}/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  }
}

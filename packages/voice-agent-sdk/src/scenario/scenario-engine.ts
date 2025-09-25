import type { Scenario, ScenarioStep } from '@maka/shared';
import { logger } from '../utils/logger';

export interface ScenarioEngineOptions {
  scenario: Scenario;
  onStepChange?: (step: ScenarioStep) => void;
  onCompletion?: () => void;
}

export class ScenarioEngine {
  private readonly steps: ScenarioStep[];
  private readonly options: ScenarioEngineOptions;
  private index = -1;
  private started = false;

  constructor(options: ScenarioEngineOptions) {
    this.options = options;
    this.steps = options.scenario.steps;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.advance();
  }

  stop(): void {
    this.started = false;
    this.index = -1;
  }

  advance(): void {
    if (!this.started) return;
    if (this.index < this.steps.length - 1) {
      this.index += 1;
      this.notifyStep();
    } else {
      this.notifyCompletion();
    }
  }

  previous(): void {
    if (!this.started) return;
    if (this.index > 0) {
      this.index -= 1;
      this.notifyStep();
    }
  }

  setIndex(nextIndex: number): void {
    if (!this.started) return;
    if (nextIndex >= 0 && nextIndex < this.steps.length) {
      this.index = nextIndex;
      this.notifyStep();
    }
  }

  reset(): void {
    if (!this.started) return;
    this.index = 0;
    this.notifyStep();
  }

  get currentStep(): ScenarioStep | undefined {
    if (this.index < 0) return undefined;
    return this.steps[this.index];
  }

  private notifyStep(): void {
    const step = this.currentStep;
    if (!step) return;
    logger.debug('Scenario step changed', { index: this.index, stepId: step.id });
    this.options.onStepChange?.(step);
  }

  private notifyCompletion(): void {
    logger.info('Scenario completed');
    this.options.onCompletion?.();
  }
}

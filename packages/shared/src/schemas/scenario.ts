import { z } from 'zod';

export const personaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tone: z.string(),
  motivations: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([])
});

export const objectiveSchema = z.object({
  id: z.string(),
  description: z.string(),
  successCriteria: z.array(z.string()).min(1),
  metrics: z.array(z.string()).default([])
});

export const scenarioStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  prompt: z.string(),
  expectedSkills: z.array(z.string()).default([]),
  objectionIds: z.array(z.string()).default([]),
  hints: z.array(z.string()).default([]),
  guardrails: z.array(z.string()).default([])
});

export const objectionSchema = z.object({
  id: z.string(),
  summary: z.string(),
  difficulty: z.enum(['low', 'medium', 'high']).default('medium'),
  recommendedStrategies: z.array(z.string()).default([])
});

export const scenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  locale: z.string().default('fr-FR'),
  persona: personaSchema,
  objectives: z.array(objectiveSchema).min(1),
  steps: z.array(scenarioStepSchema).min(1),
  objections: z.record(objectionSchema),
  knowledgeBase: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    tags: z.array(z.string()).default([])
  })).default([]),
  scoring: z.object({
    realtimeWeights: z.record(z.number()).default({}),
    completionWeights: z.record(z.number()).default({})
  }).default({ realtimeWeights: {}, completionWeights: {} })
});

export type Persona = z.infer<typeof personaSchema>;
export type Objective = z.infer<typeof objectiveSchema>;
export type ScenarioStep = z.infer<typeof scenarioStepSchema>;
export type Objection = z.infer<typeof objectionSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;

export const validateScenario = (input: unknown): Scenario => scenarioSchema.parse(input);

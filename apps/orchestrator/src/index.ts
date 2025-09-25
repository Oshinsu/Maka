import Fastify from 'fastify';
import websocket from 'fastify-websocket';
import OpenAI from 'openai';
import type { ScenarioRuntimeConfig, AgentToolDefinition } from '@maka/shared';
import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  PORT: z.string().default('4001')
});

const env = envSchema.parse(process.env);

const app = Fastify({ logger: true });
app.register(websocket);

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const toolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any()).default({})
});

const configureSchema = z.object({
  scenario: z.custom<ScenarioRuntimeConfig>(),
  tools: z.array(toolSchema)
});

const activeSessions = new Map<string, { scenario: ScenarioRuntimeConfig; tools: AgentToolDefinition[] }>();

app.post('/sessions/:sessionId/configure', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  const payload = configureSchema.parse(request.body);
  activeSessions.set(sessionId, payload);

  // In production we would use OpenAI realtime session APIs here. For now we warm up instructions.
  await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: `Initialisation du scénario ${payload.scenario.scenarioId} en ${payload.scenario.language}`
          }
        ]
      }
    ]
  });

  return reply.code(204).send();
});

app.post('/sessions/:sessionId/resume', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  if (!activeSessions.has(sessionId)) {
    return reply.code(404).send({ message: 'Unknown session' });
  }
  return reply.code(204).send();
});

app.delete('/sessions/:sessionId', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  activeSessions.delete(sessionId);
  return reply.code(204).send();
});

app.get('/healthz', async () => ({ status: 'ok' }));

app.listen({ host: '0.0.0.0', port: Number(env.PORT) }).catch(error => {
  app.log.error(error, 'Failed to start orchestrator');
  process.exit(1);
});

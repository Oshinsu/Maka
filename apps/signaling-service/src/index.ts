import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4010')
});

const env = envSchema.parse(process.env);

const app = Fastify({ logger: true });

type SessionDescription = { type: string; sdp: string };
type IceCandidate = { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null };

const sessionStore = new Map<
  string,
  {
    offer?: SessionDescription;
    answer?: SessionDescription;
    candidates: IceCandidate[];
  }
>();

const offerSchema = z.object({
  offer: z.object({ type: z.string(), sdp: z.string() })
});

const iceSchema = z.object({
  candidate: z.object({
    candidate: z.string(),
    sdpMid: z.string().nullable(),
    sdpMLineIndex: z.number().nullable()
  })
});

app.post('/sessions/:sessionId/offer', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  const payload = offerSchema.parse(request.body);
  const session = sessionStore.get(sessionId) ?? { candidates: [] };
  session.offer = payload.offer;
  session.answer = {
    type: 'answer',
    sdp: `v=0\no=- 0 0 IN IP4 127.0.0.1\ns=MAKA-SIGNALING\nt=0 0\nm=audio 9 UDP/TLS/RTP/SAVPF 111\na=recvonly\na=mid:0\n`
  };
  sessionStore.set(sessionId, session);
  return reply.send({ answer: session.answer });
});

app.post('/sessions/:sessionId/ice', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  const payload = iceSchema.parse(request.body);
  const session = sessionStore.get(sessionId);
  if (!session) {
    return reply.code(404).send({ message: 'Session not found' });
  }
  session.candidates.push(payload.candidate);
  sessionStore.set(sessionId, session);
  return reply.code(204).send();
});

app.post('/sessions', async (_request, reply) => {
  const sessionId = randomUUID();
  sessionStore.set(sessionId, { candidates: [] });
  return reply.send({ sessionId });
});

app.get('/healthz', async () => ({ status: 'ok' }));

app.listen({ host: '0.0.0.0', port: Number(env.PORT) }).catch(error => {
  app.log.error(error, 'Failed to start signaling service');
  process.exit(1);
});

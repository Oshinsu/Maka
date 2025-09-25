# Maka Voice Training Platform

This repository hosts a September 2025-ready architecture for training sales students with a realtime voice agent powered by WebRTC and OpenAI realtime models.

## Structure

- `packages/voice-agent-sdk` – TypeScript client SDK that manages WebRTC media, realtime orchestration calls and scenario playback.
- `packages/shared` – Shared schemas and typings for scenarios and runtime configuration.
- `apps/orchestrator` – Fastify service that prepares OpenAI realtime sessions and coordinates tools/instructions.
- `apps/signaling-service` – Minimal WebRTC signaling API placeholder for offer/answer exchange and ICE handling.
- `scenarios/` – Example YAML scenario for selling a website in French.

## Getting started

1. Install dependencies with **pnpm 9**.
   ```bash
   pnpm install
   ```
2. Build all packages and apps.
   ```bash
   pnpm build
   ```
3. Start the orchestration and signaling services in parallel for local experiments.
   ```bash
   pnpm --filter @maka/orchestrator dev
   pnpm --filter @maka/signaling-service dev
   ```
4. Consume the SDK in a Next.js or React client by instantiating `VoiceAgentClient` with fetched session tokens and scenario configuration.

## Voice agent SDK overview

The SDK exposes a high-level `VoiceAgentClient` that:

- Validates scenarios with Zod schemas.
- Negotiates media streams with adaptive silence detection for MOS-friendly audio.
- Coordinates realtime session configuration through the orchestrator and handles reconnection.
- Emits typed events (`state`, `voice-activity`, `step`) to integrate with UI dashboards.

Internally, it leverages modular components:

- `ScenarioEngine` for prompt progression and randomisation hooks.
- `WebRTCTransport` wrapper for ICE/SDP handling.
- `AudioProcessor` for lightweight VAD telemetry.
- `RealtimeVoiceClient` for orchestrator communication and tool registration.

## Services

### Orchestrator

A Fastify service that validates runtime configuration, primes OpenAI responses and would host realtime tool plumbing (CRM mocks, scoring) in production.

Environment variables:

- `OPENAI_API_KEY` – required OpenAI credential.
- `PORT` – (optional) HTTP port, defaults to `4001`.

### Signaling service

A placeholder WebRTC signaling API illustrating how offers, answers and ICE candidates are exchanged. In production this would proxy to LiveKit or another SFU and handle TURN credentials.

Environment variables:

- `PORT` – (optional) HTTP port, defaults to `4010`.

## Scenario authoring

Author training scenarios in YAML under `scenarios/`. They are validated using `packages/shared` schemas before being loaded into the SDK. The sample file `website-sales.fr.yaml` demonstrates persona metadata, objectives, objections and scoring weights tuned for French-speaking sales coaching.

## Next steps

- Integrate with LiveKit Cloud for media relaying and add authentication policies via Supabase Edge Functions.
- Extend `RealtimeVoiceClient` to stream WebRTC audio directly into OpenAI Realtime (gpt-5o) with guardrails.
- Build a React UI harness around `VoiceAgentClient` featuring dashboards, transcripts and analytics.
- Add automated Vitest suites and contract tests between SDK and backend services.

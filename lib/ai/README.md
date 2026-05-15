# lib/ai

The only directory that talks to OpenAI. Every call goes through
`client.ts` (writes to `prompts_log`, enforces cost cap, respects
the kill switch flags).

Lands in `feat/prompt-runtime`:
- `client.ts` — OpenAI wrapper
- `model.ts` — resolves `OPENAI_MODE` env var to a model id
- `prompts/` — prompt builders (load markdown from `docs/prompts/`,
  interpolate property knowledge + brand voice)
- `pipelines/` — invention.ts, asset-gen.ts, partner-research.ts,
  post-event.ts, chat-router.ts
- `guardrails.ts` — hard/soft rule checker
- `brand-voice.ts` — voice context loader + post-generation
  conformance scorer
- `images.ts` — `generateDecorativeImage(category, styleBrief)`
  per PLAN.md §6

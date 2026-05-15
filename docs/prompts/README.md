# Master prompts

Prompts are code, not config — versioned here as markdown, loaded by
`lib/ai/prompts/` and tested as part of the build (see `docs/prompts/evals/`).

Lands in `feat/invention-pipeline`, `feat/asset-text-prompts`, etc:

- `event-invention.md`
- `package-proposal.md`
- `asset-{type}.md` — one per asset type (11 in total)
- `on-demand-chat.md`
- `partner-research.md`
- `post-event-synthesis.md`
- `brand-voice-conformance.md`

Every prompt template must include the "respect property knowledge"
instruction (rendered automatically by `buildSystemPrompt` per PLAN.md §4.1).

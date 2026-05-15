# lib/jobs

Inngest function definitions. Lands progressively across
`feat/asset-pack-generate`, `feat/cron-and-digest`, and others.

Every function checks the relevant kill-switch flag at the top
(`generation_paused` / `cron_paused` / `on_demand_paused`) per
PLAN.md §7.

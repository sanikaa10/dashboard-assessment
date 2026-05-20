# ArmorHQ Sales Dashboard

Built for Dana, Head of Sales — answers two questions at a glance:
1. Are we getting better or worse week to week?
2. Who do I call Monday morning?

## What's on the dashboard

| Section | What it shows |
|---|---|
| **Connected Calls (Last 7 Days)** | Dana's primary KPI — live query, rolling window, with WoW % change |
| **Prior Week Connected** | Baseline for WoW comparison |
| **Top Performers** | 3 agents with most connected calls this week |
| **Monday Morning — Needs Attention** | Agents who dropped >20% WoW or had <5 connected calls |
| **Team Summary** | All teams ranked by connected calls, with connect rate |

## Architecture decisions

- **Server components only** — no client JS needed. `revalidate = 0` forces fresh DB reads on every request.
- **`src/lib/queries.ts` is the single data layer.** All SQL lives there; routes and pages call functions, not `getDb()` directly.
- **Recursive CTEs for daily fill** — SQLite doesn't have a `generate_series`, so `WITH RECURSIVE dates(d)` fills zero-call days so the API always returns exactly 28/14 rows.
- **No charting library added** — the ask was clean and functional. Tables communicate trends clearly without a bundle hit.

## API endpoints

All endpoints return live data and set `Cache-Control: no-store`.

| Endpoint | Description |
|---|---|
| `GET /api/weekly-digest` | 28 days of daily stats + top 3 agents |
| `GET /api/weekly-digest.csv` | Same daily data as CSV for Google Sheets |
| `GET /api/agents/[id]/scorecard` | One agent's 14-day history and totals |
| `GET /api/teams/[name]/summary` | One team's 7-day roll-up (URL-encode spaces) |

Example: `/api/teams/West%20Coast/summary`

404 responses use `{ "error": "agent_not_found", "id": "..." }` / `{ "error": "team_not_found", "name": "..." }`.

## Running locally

```bash
node --version   # must be >=22.5.0
pnpm install
pnpm seed        # populates data.db
pnpm dev         # http://localhost:3000
```

## Tests

```bash
pnpm test
```

Tests in `src/test/metrics.test.ts` cover the three core metric calculations:
- `connectRate` — handles zero-total edge case
- `wowDelta` — handles zero-prior-week baseline
- `needsAttention` — boundary conditions for the Monday attention list

## Stack

Next.js 15 · React 19 · Tailwind CSS · shadcn/ui · SQLite (`node:sqlite`) · Vitest

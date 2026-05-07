# Growth Forge Agent

Minimal v1 build for the Shipyard Scanner growth loop.

## Sources

- GitHub
- Hacker News
- Reddit

## Pipeline

1. `npm run find`
2. `npm run score`
3. `npm run enrich`
4. `npm run draft`
5. `npm run send`
6. `npm run track`
7. `npm run report`

Or run the full flow:

`npm run run`

## Setup

1. Copy `.env.example` to `.env`
2. Fill in the credentials
3. Make sure the Google Sheet is shared with the service account
4. Keep `ENABLE_GITHUB_OUTREACH=false` until you want live sends

## Fresh outreach memory

Successful live sends are remembered in `agent/state/contacted.json`.

If a repo or developer has already been contacted, future live sends skip them automatically.

## Static logs

`npm run report` generates:

- `docs/index.html`
- `docs/latest.json`
- `docs/runs/<runId>.json`

This is suitable for GitHub Pages hosting.

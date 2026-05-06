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

Or run the full flow:

`npm run run`

## Setup

1. Copy `.env.example` to `.env`
2. Fill in the credentials
3. Make sure the Google Sheet is shared with the service account
4. Keep `ENABLE_GITHUB_OUTREACH=false` until you want live sends

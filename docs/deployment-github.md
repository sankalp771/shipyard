# GitHub Deployment And Scheduling

This doc explains how to run the growth agent without manually overseeing it.

## Short answer

Use:

- `GitHub Actions` for the cron job
- `GitHub Pages` only if you want to host a static dashboard or documentation site

GitHub Pages does **not** run server jobs on a schedule. It only hosts static files.

Official GitHub docs:

- [What is GitHub Pages?](https://docs.github.com/pages/getting-started-with-github-pages/what-is-github-pages)
- [About workflows](https://docs.github.com/en/actions/using-workflows/about-workflows)
- [Workflow syntax: on.schedule](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)

## Best setup for this project

### What runs where

Use `GitHub Actions` to run:

- `npm run find`
- `npm run score`
- `npm run enrich`
- `npm run draft`
- `npm run send`
- `npm run track`

Use `GitHub Pages` only for:

- a static status page
- static docs
- a lightweight HTML dashboard fed by committed JSON files
- the generated outreach log site in `docs/index.html`

## Why not GitHub Pages for the cron job

GitHub Pages is a static site host. GitHub’s docs describe it as serving HTML, CSS, and JavaScript from a repository. It does not execute scheduled backend jobs.

So if your goal is:

- "run every 12 hours automatically"

then the correct tool is:

- `GitHub Actions schedule`

## Recommended unattended architecture

### Option A: simplest and best now

- keep the code in a GitHub repo
- store secrets in GitHub Actions secrets
- create one scheduled workflow
- let the workflow run the full Node pipeline
- keep Google Sheets as the live tracker

This is the best current option.

### Option B: Actions + GitHub Pages

If you want a public or private status page:

- the scheduled GitHub Action runs the pipeline
- after the run, it writes summary JSON or HTML into a Pages branch or folder
- GitHub Pages serves that static output

This gives you:

- automated runs
- lightweight hosted visibility

## What secrets to store in GitHub

In the GitHub repo, go to:

- `Settings -> Secrets and variables -> Actions`

Store these as repository secrets:

- `GITHUB_TOKEN_CUSTOM` for the outreach account token
- `LLM_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_SHEET_ID`
- `VIDEODB_BASE_URL`
- `OUTREACH_GITHUB_USERNAME`

Important:

- do not commit real secrets into `.env`
- for `GOOGLE_SERVICE_ACCOUNT_JSON`, store the full JSON string as a secret, then write it to a file during the workflow

## Suggested workflow file

Path:

- `.github/workflows/run-growth-agent.yml`

Example:

```yaml
name: Run Growth Agent

on:
  workflow_dispatch:
  schedule:
    - cron: "0 */12 * * *"

jobs:
  run-agent:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Write Google service account file
        shell: bash
        run: |
          printf '%s' '${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}' > google-service-account.json

      - name: Create env file
        shell: bash
        run: |
          cat > .env <<EOF
          GITHUB_MAIN_USERNAME=sankalp771
          GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN_CUSTOM }}
          LLM_API_KEY=${{ secrets.LLM_API_KEY }}
          LLM_API_URL=https://openrouter.ai/api/v1/chat/completions
          LLM_MODEL=openrouter/free
          GOOGLE_SERVICE_ACCOUNT_JSON=${{ github.workspace }}/google-service-account.json
          GOOGLE_SHEET_ID=${{ secrets.GOOGLE_SHEET_ID }}
          VIDEODB_BASE_URL=${{ secrets.VIDEODB_BASE_URL }}
          ENABLE_GITHUB_OUTREACH=true
          OUTREACH_GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN_CUSTOM }}
          OUTREACH_GITHUB_USERNAME=${{ secrets.OUTREACH_GITHUB_USERNAME }}
          DRAFT_LIMIT=5
          LIVE_SEND_LIMIT=3
          LIVE_SEND_MIN_SCORE=8
          EOF

      - name: Run pipeline
        run: npm run run
```

## Timezone note

GitHub Actions cron uses `UTC`.

Official docs note that scheduled workflows use POSIX cron syntax and run at UTC times.

So if you want:

- every 12 hours, current example is fine:
  - `0 */12 * * *`

If you want a specific India time, convert `Asia/Calcutta` to UTC when writing the cron.

## How to add GitHub Pages too

If you want a static dashboard:

1. create a `docs-site/` or `public/` folder with HTML/JS
2. have the Action run `npm run report` after each run
3. publish that folder with GitHub Pages

GitHub docs say Pages can publish from a branch/folder or from a custom GitHub Actions workflow.

Good use here:

- host docs
- host a simple run history page
- host charts built from committed JSON snapshots
- host the latest outreach audit trail from:
  - `docs/index.html`
  - `docs/latest.json`
  - `docs/runs/<runId>.json`

## Recommended practical decision

For this project, do this:

1. run the agent on `GitHub Actions`
2. keep Google Sheets as the source of truth
3. optionally add `GitHub Pages` later for a status/dashboard layer

That is the cleanest unattended setup.

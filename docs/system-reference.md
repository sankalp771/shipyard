# Growth Agent System Reference

This file explains how the current system works, which files control each stage, what rules are used, and how the `agent/data` folder gets populated.

## Is there already a file that explains all this?

Before this doc, not fully.

Existing docs covered only part of the system:

- [README.md](D:\Temp\growth_agent\README.md): basic usage and setup
- [metric/README.md](D:\Temp\growth_agent\metric\README.md): owned metric
- [attribution/utm-links.md](D:\Temp\growth_agent\attribution\utm-links.md): UTM structure

This file is the first neat end-to-end explanation of:

- source scraping rules
- scoring rules
- enrichment behavior
- drafting behavior
- send behavior
- tracking behavior
- `agent/data` lifecycle

## Pipeline overview

The current pipeline is:

`find -> score -> enrich -> draft -> send -> track`

Code entrypoints:

- [find.js](D:\Temp\growth_agent\agent\find.js)
- [score.js](D:\Temp\growth_agent\agent\score.js)
- [enrich.js](D:\Temp\growth_agent\agent\enrich.js)
- [draft.js](D:\Temp\growth_agent\agent\draft.js)
- [send.js](D:\Temp\growth_agent\agent\send.js)
- [track.js](D:\Temp\growth_agent\agent\track.js)
- [index.js](D:\Temp\growth_agent\agent\index.js)

Shared helpers:

- [sources.js](D:\Temp\growth_agent\agent\lib\sources.js)
- [github.js](D:\Temp\growth_agent\agent\lib\github.js)
- [llm.js](D:\Temp\growth_agent\agent\lib\llm.js)
- [google.js](D:\Temp\growth_agent\agent\lib\google.js)
- [config.js](D:\Temp\growth_agent\agent\lib\config.js)
- [utils.js](D:\Temp\growth_agent\agent\lib\utils.js)

## How source scraping works

The scrape logic lives in [sources.js](D:\Temp\growth_agent\agent\lib\sources.js).

### Hacker News scraping

Function:

- `fetchHackerNewsSignals()`

Source:

- HN Algolia `search_by_date`

Current rules:

- query is focused on media / audio / speech terms
- uses recent-window filtering through `numericFilters`
- only keeps items that still pass local relevance checks
- keeps `Show HN` style developer-launch signals

Fields captured:

- `source`
- `sourceId`
- `developer`
- `title`
- `url`
- `summary`
- `signalMetrics.points`
- `signalMetrics.comments`
- `discoveredAt`

### GitHub scraping

Function:

- `fetchGithubSignals(token)`

Source:

- GitHub repository search API

Current rules:

- searches term-by-term, not one huge query
- uses media / audio / speech-builder search phrases
- filters to recently pushed repos
- excludes `archived` repos
- excludes `fork` repos
- deduplicates repos by GitHub repo id
- drops repos whose name/description still do not look media-relevant

Why some GitHub repos are recent and some are popular:

- we sort by recent updates, so freshness matters
- we still record stars/forks/watchers, so some leads are also popular
- this means a result can be both `recent` and `popular`
- the system is not only looking for famous repos; it is looking for recently active relevant builders

Fields captured:

- `source`
- `sourceId`
- `developer`
- `title`
- `repo`
- `repoUrl`
- `summary`
- `language`
- `signalMetrics.stars`
- `signalMetrics.forks`
- `signalMetrics.openIssues`
- `signalMetrics.watchers`
- `discoveredAt`

### Reddit scraping

Function:

- `fetchRedditSignals()`

Source:

- public subreddit JSON feeds

Current subreddits:

- `r/MachineLearning`
- `r/LocalLLaMA`
- `r/SideProject`
- `r/OpenAI`

Current rules:

- only recent posts are considered
- title/body must include builder-intent phrases
- title/body must also include media-relevant terms
- obvious `hiring/job` noise is excluded

Fields captured:

- `source`
- `sourceId`
- `developer`
- `title`
- `url`
- `summary`
- `signalMetrics.score`
- `signalMetrics.comments`
- `signalMetrics.upvoteRatio`
- `discoveredAt`

## How scoring works

Scoring logic lives in [score.js](D:\Temp\growth_agent\agent\score.js).

Each raw lead becomes a scored lead with:

- `score`
- `qualified`

### Current scoring rules

Base problem relevance:

- if title or summary contains media/problem terms such as `search`, `transcription`, `audio`, `video`, `whisper`, `index`: `+3`

High-intent launch language:

- if title/summary includes terms such as `shipped`, `launched`, `released`, `show hn`, `demo`: `+2`

Code/tooling language:

- if title/summary includes terms like `api`, `sdk`, `repo`, `pipeline`, `app`, `tool`: `+1`

Language preference:

- if repo language is one of `python`, `typescript`, `javascript`, `go`, `rust`: `+1`

Traction:

- if stars or points or Reddit score show basic traction: `+2`

Engagement:

- if forks or comments exist: `+1`

Extra quality:

- if watchers exist or Reddit upvote ratio is strong: `+1`

Repository presence:

- if lead has a repo: `+2`

Developer validity:

- if developer exists and does not look like a bot: `+1`

Final score:

- capped at `10`

Qualification threshold:

- `qualified = score >= 7`

## How enrichment works

Enrichment logic lives in [enrich.js](D:\Temp\growth_agent\agent\enrich.js).

It currently enriches mainly GitHub-backed leads.

### Repo enrichment

If a lead has `item.repo`, the system tries to fetch:

- full repo metadata
- raw README content

Stored fields:

- `repoStats.stars`
- `repoStats.forks`
- `repoStats.watchers`
- `repoStats.language`
- `repoStats.pushedAt`
- `readmeSnippet`

If repo lookup fails:

- `repoError`

### GitHub profile enrichment

If the source is GitHub, the system also fetches:

- `login`
- `name`
- `bio`
- `followers`
- `publicRepos`
- `blog`
- `createdAt`

Stored under:

- `githubProfile`

If profile lookup fails:

- `profileError`

### Enrichment cap

Currently:

- only qualified leads are enriched
- max enriched items per run: `25`

This keeps the run manageable.

## How drafting works

Drafting logic lives in [draft.js](D:\Temp\growth_agent\agent\draft.js).

LLM integration lives in [llm.js](D:\Temp\growth_agent\agent\lib\llm.js).

### Current drafting behavior

For each enriched lead:

- a UTM link is created
- a prompt is assembled from project info, summary, repo context, bio, and README snippet
- the LLM returns a short technical message

Stored fields:

- `utmLink`
- `draft`

### Draft cap

Configured through:

- `DRAFT_LIMIT`

Right now it is used to keep runs smaller during validation.

## How sending works

Send logic lives in [send.js](D:\Temp\growth_agent\agent\send.js).

Current behavior:

- safe by default
- if live outreach is disabled, the result is a `dry-run`

Live GitHub send only happens if:

- `ENABLE_GITHUB_OUTREACH=true`
- a valid outreach GitHub token exists

Current GitHub send strategy:

- find an open issue in the repo
- post the drafted message as a comment

Stored under:

- `delivery.channel`
- `delivery.sent`
- `delivery.reason`
- `delivery.targetUrl`

## How tracking works

Tracking logic lives in [track.js](D:\Temp\growth_agent\agent\track.js).

Google auth and sheet writes live in [google.js](D:\Temp\growth_agent\agent\lib\google.js).

Current behavior:

- service-account auth is used
- the first sheet tab is auto-detected
- header row is written
- each lead becomes one appended row

Tracked columns:

- `Timestamp`
- `Run ID`
- `Source`
- `Developer`
- `Repo`
- `Score`
- `Channel`
- `Sent`
- `UTM Link`
- `Draft`

## How the `agent/data` folder populates

This is the operational log of the pipeline.

Folder:

- [agent/data](D:\Temp\growth_agent\agent\data)

### File sequence

When you run the full pipeline, files appear in this order:

1. `raw-<runId>.json`
2. `scored-<runId>.json`
3. `enriched-<runId>.json`
4. `drafted-<runId>.json`
5. `sent-<runId>.json`

### What each file means

`raw-...json`

- direct output from source scrapers
- contains broad candidate leads before qualification

`scored-...json`

- same leads with `score` and `qualified`
- this is where rule-based filtering becomes explicit

`enriched-...json`

- only qualified leads, enriched with GitHub repo/profile context

`drafted-...json`

- enriched leads plus UTM links and drafted outreach copy

`sent-...json`

- drafted leads plus delivery result
- in current safe mode this is mostly `dry-run`

### Why you may see different batch sizes

Because each stage narrows or reshapes the set:

- raw may be broad
- scored may keep many but mark only some as qualified
- enriched usually only keeps qualified leads
- drafted may be smaller still if `DRAFT_LIMIT` is set

So yes, some files naturally contain:

- recent GitHub repos
- some popular GitHub repos
- some smaller repos
- a filtered subset only after score/enrich

That is expected.

## Config that controls behavior

Main config lives in:

- [config.js](D:\Temp\growth_agent\agent\lib\config.js)
- [.env.example](D:\Temp\growth_agent\.env.example)

Important settings:

- `GITHUB_TOKEN`
- `LLM_API_KEY`
- `LLM_API_URL`
- `LLM_MODEL`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_SHEET_ID`
- `VIDEODB_BASE_URL`
- `ENABLE_GITHUB_OUTREACH`
- `OUTREACH_GITHUB_TOKEN`
- `OUTREACH_GITHUB_USERNAME`
- `DRAFT_LIMIT`

## Current limitations

- HN results can still be sparse depending on recent Show HN activity
- Reddit JSON is read-only and noisy by nature
- GitHub search quality depends heavily on search terms
- scoring is still heuristic, not learned
- send layer is intentionally conservative

## Recommended reading order

If you want to understand the system quickly:

1. [README.md](D:\Temp\growth_agent\README.md)
2. [docs/2026-05-06-update.md](D:\Temp\growth_agent\docs\2026-05-06-update.md)
3. [docs/system-reference.md](D:\Temp\growth_agent\docs\system-reference.md)
4. [sources.js](D:\Temp\growth_agent\agent\lib\sources.js)
5. [score.js](D:\Temp\growth_agent\agent\score.js)

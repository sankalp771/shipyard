# Shipyard Scanner
### A fully autonomous developer acquisition agent for VideoDB
**Growth Forge Submission · Sankalp Pandey**
[LinkedIn](https://www.linkedin.com/in/sankalp-pandey-393a3b2a4/) · [GitHub](https://github.com/sankalp771)

---

## What this is

Every 12 hours, an agent wakes up, scans the internet for developers actively shipping video and audio AI apps, scores them by fit, enriches their profile, writes a technically precise outreach message, sends it through an automated channel, and tracks the result end to end.

This is not a spray-and-pray campaign and not a script that dumps leads into a sheet for manual sorting. It is a growth loop: find the highest-intent builders, understand what they just shipped, connect VideoDB to the exact technical problem they now have, and learn from the outcome every cycle.

---

## The core insight

Most developer outreach targets who someone is: their title, company, followers, or GitHub stars.

Shipyard Scanner targets what someone just did: they shipped a video or audio AI app in the last 12 hours.

That is a stronger signal. It is behavioral, not demographic. The developer is already in motion, already building, and much more likely to care about infrastructure that solves the bottlenecks they are about to hit.

**Intent over identity.**

---

## Metric owned

**Content → Pipeline** — specifically, developer signal → qualified signup.

Every developer the agent finds, scores, and reaches carries a unique UTM link. When they sign up, the conversion is attributed back to the exact source and run. By Day 10 of the proving run, the dashboard should show a real conversion curve, not just activity.

---

## Architecture overview

```text
SCAN → SCORE → ENRICH → DRAFT → SEND → TRACK → LEARN
  ↑                                           |
  └────────────── every 12 hours ─────────────┘
```

### Step 1 — Scan

The agent checks four high-signal sources every 12 hours:

| Source | What it looks for | API |
|---|---|---|
| Hacker News | "Show HN" posts mentioning video, audio, ffmpeg, transcription, podcast, streaming | HN Algolia API — free, no auth |
| GitHub | New repos this week tagged video-ai, audio-ai, speech-to-text, media-processing | GitHub Search API — free |
| Product Hunt | Today's launches in Developer Tools + AI with video/audio keywords | Product Hunt GraphQL API — free |
| Reddit | r/MachineLearning, r/LocalLLaMA posts saying "just shipped" with video/audio context | Reddit JSON API — free, no auth |

Output: a raw list of developers, what they shipped, and where the signal came from, stored as JSON.

### Step 2 — Score

Each developer gets a relevance score from 0–10 using simple signals:

- GitHub bio mentions video, audio, media, or streaming: `+2`
- Repo has commits in the last 30 days: `+2`
- README mentions a problem VideoDB directly solves: `+3`
- Existing traction such as stars, forks, or HN upvotes: `+2`
- Solo builder or small team, not a large company: `+1`

Only developers scoring 7 or above move forward. Typically 15–25 per run.

### Step 3 — Enrich

For each qualified developer, the agent pulls:

- Full GitHub profile: languages, top repos, account age, follower count
- Stack inference from repo language breakdown
- Public contact or social presence: website, X handle, GitHub contact links

That turns a raw signal into a usable picture:

*"Solo Python developer, just shipped a podcast search tool using Whisper, 200 GitHub followers, README mentions search gets slow at scale."*

### Step 4 — Draft

The agent generates one personalized outreach message per developer.

The prompt is grounded in three facts:

1. What the developer just built
2. What specific bottleneck in their stack VideoDB solves
3. One concrete thing VideoDB enables that they cannot do easily right now

The output is not a generic pitch. It is a technical observation plus one relevant link with a UTM tag.

Example:

> "Saw your HN post — building podcast search on top of Whisper is exactly the right instinct. The part that gets painful at scale is keeping the index fresh as episodes drop. VideoDB handles that loop natively — relevant bit here: [link]. Happy to share more if useful."

### Step 5 — Send

This is where the system becomes fully autonomous.

Once a message is drafted, the agent sends it through the best available public channel without waiting for manual review.

Primary automation surfaces:

- GitHub issues or discussions when the project and context fit naturally
- Public contact forms on the developer's project or personal site
- Publicly listed email addresses when available
- Reddit or Hacker News replies when the signal originated there and the message fits the thread

Channel selection is rule-based:

- If the developer is most reachable in the same place they shipped, reply there first
- If there is a direct public contact method, prefer that over broad public posting
- If no credible public path exists, the agent logs the lead as qualified but unsent rather than forcing low-quality outreach

The send layer uses a dedicated operator identity, so the system can act consistently without depending on my main LinkedIn account.

### Step 6 — Track

Every run appends rows to a live tracker with:

| Timestamp | Source | Developer | Repo | Score | Channel | Message sent | UTM link | Clicked | Signed up |
|---|---|---|---|---|---|---|---|---|

This can be stored in Google Sheets for simplicity, with a lightweight Vercel dashboard on top so the team can watch the loop in real time.

Dashboard views:

- Developers found per run
- Funnel: found → qualified → sent → clicked → signed up
- Top-performing source
- Top-performing send channel
- Best-performing message variant
- Running signup count with attribution

### Step 7 — Learn

After each run, the agent compares:

- Which source produced the highest-scoring developers
- Which threshold produced the best click-to-signup ratio
- Which message style performed best

Those learnings update the scoring weights and draft prompt for the next cycle. The loop improves every 12 hours automatically.

---

## Outreach identity

I cannot use my main LinkedIn for this process, so the system should use a separate professional outreach identity.

That identity should be:

- A real, clean builder profile created specifically for this project
- Consistent across GitHub, email, and any public-facing contact point
- Honest about being part of an outreach or developer relations workflow
- Professional enough that the message feels peer-to-peer, not anonymous

This should not be framed as a fake account. It is a dedicated operator identity for the agent and the project, used to protect my main profile while keeping outreach organized and credible.

LinkedIn still matters here, but as credibility infrastructure rather than the main automation surface. The fresh profile gives the outreach identity a real public face, while the actual autonomous send layer operates through GitHub, email, contact forms, Reddit, and Hacker News where appropriate.

So the model is:

- LinkedIn: trust layer and identity proof
- GitHub / email / forms / community replies: automated outreach layer

---

## Deployment

### GitHub Actions — the runner

The agent lives in a GitHub repo. A cron workflow triggers `agent/index.js` every 12 hours.

```yaml
on:
  schedule:
    - cron: '0 */12 * * *'
```

No server to manage. No hosting cost.

### Vercel — the dashboard

A small Next.js dashboard on Vercel reads the tracker data and shows the loop live. This is the right place to make the work legible for the VideoDB team from Day 1.

---

## Full stack — zero-cost build

| Tool | Purpose | Cost |
|---|---|---|
| Node.js | Agent runtime | Free |
| HN Algolia API | Scan Hacker News | Free |
| GitHub REST API | Discovery and enrichment | Free |
| Product Hunt GraphQL API | Scan launches | Free |
| Reddit JSON API | Scan relevant subreddits | Free |
| Claude API | Draft personalized messages | Free tier for demo |
| Google Sheets API | Live tracking store | Free |
| GitHub Actions | Run every 12 hours | Free |
| Vercel | Live dashboard UI | Free tier |
| Dedicated outreach email | Automated send identity | Free |

**Total infrastructure cost: ₹0**

Once selected, the same loop can run on VideoDB's provisioned stack with deeper retrieval and stronger agent tooling. The architecture stays the same.

---

## Build plan

### Phase 1 — Day 1: Scanner working

**Goal:** Find real developers from real sources and output clean JSON.

- Set up the `growth-forge/` folder structure
- Write `agent/find.js`
- Parse responses into normalized developer records
- Save raw output to `agent/data/raw-[timestamp].json`
- Write `metric/README.md` to lock the owned metric

### Phase 2 — Day 2: Score + enrich working

**Goal:** Filter noise and build a complete picture for qualified developers.

- Write `agent/score.js`
- Write `agent/enrich.js`
- Chain `find → score → enrich`
- Save enriched output to `agent/data/enriched-[timestamp].json`

### Phase 3 — Day 3: Draft + send + track + demo

**Goal:** Complete the full loop and record the demo.

- Write `agent/draft.js`
- Write `agent/send.js`
- Write `agent/track.js`
- Write `agent/index.js`
- Set up GitHub Actions cron
- Set up the Vercel dashboard
- Document UTM structure in `attribution/utm-links.md`
- Record a Loom showing the loop live

### Phase 4 — Days 4–14: Experiments + iteration

Three planned experiments:

- Source comparison: HN-only vs GitHub-only vs all sources
- Message length: under 60 words vs 100–150 words
- Timing: immediate outreach vs scheduled send by developer timezone

Two planned iterations:

- After Day 7: tighten scoring weights based on what converts
- After Day 12: rewrite the prompt template based on winning message style

### Phase 5 — Days 15–24: Proving run

- [ ] Agent runs every 12 hours without failing
- [ ] Tracker updates automatically after every run
- [ ] Automated sends happen through valid public channels
- [ ] UTM clicks are attributed to signups
- [ ] Dashboard URL is shared with the VideoDB team from Day 1
- [ ] `submission/spend-and-efficiency.csv` is updated daily
- [ ] `submission/next-steps.md` is ready for handoff

---

## Folder structure

```text
growth-forge/
├── metric/
│   ├── README.md
│   └── baseline.md
├── attribution/
│   ├── utm-links.md
│   └── dashboard.url
├── agent/
│   ├── find.js
│   ├── score.js
│   ├── enrich.js
│   ├── draft.js
│   ├── send.js
│   ├── track.js
│   ├── index.js
│   └── data/
├── experiments/
│   ├── exp-01-source-comparison.md
│   ├── exp-02-message-length.md
│   └── exp-03-send-timing.md
├── loops/
│   └── loop-01-signal-to-signup.md
├── iterations/
│   ├── iteration-01-scoring-weights.md
│   └── iteration-02-message-template.md
└── submission/
    ├── architecture.md
    ├── walkthrough.mp4
    ├── live-links.txt
    ├── dashboard.url
    ├── spend-and-efficiency.csv
    └── next-steps.md
```

---

## Why this wins

This agent is not doing generic marketing. It is doing what a strong developer growth operator does: finding builders at the exact moment they have a problem VideoDB solves, then showing up with something technically useful.

The difference is that it does this every 12 hours, autonomously, with attribution, at zero cost, and gets smarter every cycle.

That is what "think in loops, not campaigns" looks like in production.

---

*Sankalp Pandey · Growth Forge · May 2026*
*[linkedin.com/in/sankalp-pandey-393a3b2a4](https://www.linkedin.com/in/sankalp-pandey-393a3b2a4/) · [github.com/sankalp771](https://github.com/sankalp771)*

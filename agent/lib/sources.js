const GITHUB_SEARCH_TERMS = [
  '"video ai"',
  '"audio ai"',
  '"speech to text"',
  '"media processing"',
  "whisper",
  "transcription",
  "ffmpeg",
  "podcast",
  "text-to-speech",
];

const HN_TERMS = [
  "video",
  "audio",
  "ffmpeg",
  "transcription",
  "podcast",
  "streaming",
  "whisper",
  "speech",
  "tts",
];

const REDDIT_SIGNAL_TERMS = [
  "just shipped",
  "launched",
  "built",
  "released",
  "open sourced",
  "open-sourced",
  "showing",
];

const REDDIT_SUBREDDITS = ["MachineLearning", "LocalLLaMA", "SideProject", "OpenAI"];
const MAX_SIGNAL_AGE_HOURS = 72;

function maxSignalAgeDate() {
  return new Date(Date.now() - MAX_SIGNAL_AGE_HOURS * 60 * 60 * 1000);
}

function textHasAny(text, terms) {
  const haystack = String(text || "").toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function textHasAll(text, terms) {
  const haystack = String(text || "").toLowerCase();
  return terms.every((term) => haystack.includes(term.toLowerCase()));
}

function isRecent(isoDate) {
  const value = new Date(isoDate);
  return !Number.isNaN(value.getTime()) && value >= maxSignalAgeDate();
}

function normalizeSummary(text, maxLength = 700) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function hasMediaBuilderSignal(text) {
  return textHasAny(text, HN_TERMS);
}

export async function fetchHackerNewsSignals() {
  const query = encodeURIComponent("(video OR audio OR whisper OR ffmpeg OR transcription OR podcast OR speech)");
  const afterEpoch = Math.floor(maxSignalAgeDate().getTime() / 1000);
  const url = `https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&query=${query}&numericFilters=created_at_i>${afterEpoch}&hitsPerPage=50`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HN fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.hits || [])
    .filter((hit) => {
      const text = `${hit.title || ""} ${hit.story_text || ""}`;
      return isRecent(hit.created_at) && hasMediaBuilderSignal(text);
    })
    .map((hit) => ({
      source: "hackernews",
      sourceId: String(hit.objectID),
      developer: hit.author,
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      repo: "",
      repoUrl: "",
      summary: normalizeSummary(hit.story_text || hit.title),
      signalMetrics: {
        points: hit.points || 0,
        comments: hit.num_comments || 0,
      },
      discoveredAt: hit.created_at,
    }));
}

export async function fetchGithubSignals(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "growth-agent",
  };
  const seen = new Set();
  const results = [];

  for (const term of GITHUB_SEARCH_TERMS) {
    const pushedAfter = maxSignalAgeDate().toISOString().slice(0, 10);
    const query = encodeURIComponent(`${term} in:name,description,readme pushed:>=${pushedAfter} archived:false fork:false`);
    const url = `https://api.github.com/search/repositories?q=${query}&sort=updated&order=desc&per_page=10`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`GitHub search failed: ${response.status}`);
    }

    const data = await response.json();
    for (const repo of data.items || []) {
      if (seen.has(repo.id)) {
        continue;
      }
      seen.add(repo.id);
      const text = `${repo.name || ""} ${repo.description || ""}`;
      if (!hasMediaBuilderSignal(text)) {
        continue;
      }

      results.push({
        source: "github",
        sourceId: String(repo.id),
        developer: repo.owner?.login || "",
        title: repo.full_name,
        url: repo.html_url,
        repo: repo.full_name,
        repoUrl: repo.html_url,
        summary: normalizeSummary(repo.description || ""),
        language: repo.language || "",
        signalMetrics: {
          stars: repo.stargazers_count || 0,
          forks: repo.forks_count || 0,
          openIssues: repo.open_issues_count || 0,
          watchers: repo.watchers_count || 0,
        },
        discoveredAt: repo.updated_at,
      });
    }
  }

  return results;
}

export async function fetchRedditSignals() {
  const results = [];

  for (const subreddit of REDDIT_SUBREDDITS) {
    const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=25`;
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "growth-agent/1.0",
        },
      });

      if (!response.ok) {
        console.warn(`Reddit fetch skipped for ${subreddit}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      for (const child of data.data?.children || []) {
        const post = child.data;
        const text = `${post.title || ""} ${post.selftext || ""}`;
        if (!isRecent(new Date((post.created_utc || 0) * 1000).toISOString())) {
          continue;
        }

        if (!textHasAny(text, REDDIT_SIGNAL_TERMS) || !hasMediaBuilderSignal(text)) {
          continue;
        }

        if (textHasAll(text, ["hiring", "job"])) {
          continue;
        }

        results.push({
          source: "reddit",
          sourceId: post.id,
          developer: post.author,
          title: post.title,
          url: `https://www.reddit.com${post.permalink}`,
          repo: "",
          repoUrl: "",
          summary: normalizeSummary(post.selftext || post.title),
          signalMetrics: {
            score: post.score || 0,
            comments: post.num_comments || 0,
            upvoteRatio: post.upvote_ratio || 0,
          },
          discoveredAt: new Date((post.created_utc || 0) * 1000).toISOString(),
        });
      }
    } catch (error) {
      console.warn(`Reddit fetch skipped for ${subreddit}: ${error.message}`);
    }
  }

  return results;
}

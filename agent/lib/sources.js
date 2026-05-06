const GITHUB_SEARCH_TERMS = [
  '"video ai"',
  '"audio ai"',
  "whisper",
  "transcription",
  "streaming",
  "ffmpeg",
  "podcast",
];

const HN_TERMS = ["video", "audio", "ffmpeg", "transcription", "podcast", "streaming", "whisper"];

const REDDIT_SUBREDDITS = ["MachineLearning", "LocalLLaMA", "SideProject", "OpenAI"];

function textHasAny(text, terms) {
  const haystack = String(text || "").toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

export async function fetchHackerNewsSignals() {
  const query = encodeURIComponent(HN_TERMS.join(" OR "));
  const url = `https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&query=${query}&hitsPerPage=30`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HN fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.hits || [])
    .filter((hit) => textHasAny(`${hit.title} ${hit.story_text || ""}`, HN_TERMS))
    .map((hit) => ({
      source: "hackernews",
      sourceId: String(hit.objectID),
      developer: hit.author,
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      repo: "",
      repoUrl: "",
      summary: hit.story_text || hit.title,
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
    const query = encodeURIComponent(`${term} in:name,description,readme pushed:>2026-04-01`);
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
      results.push({
        source: "github",
        sourceId: String(repo.id),
        developer: repo.owner?.login || "",
        title: repo.full_name,
        url: repo.html_url,
        repo: repo.full_name,
        repoUrl: repo.html_url,
        summary: repo.description || "",
        language: repo.language || "",
        signalMetrics: {
          stars: repo.stargazers_count || 0,
          forks: repo.forks_count || 0,
          openIssues: repo.open_issues_count || 0,
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
    const response = await fetch(url, {
      headers: {
        "User-Agent": "growth-agent",
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit fetch failed for ${subreddit}: ${response.status}`);
    }

    const data = await response.json();
    for (const child of data.data?.children || []) {
      const post = child.data;
      const text = `${post.title || ""} ${post.selftext || ""}`;
      if (!textHasAny(text, ["just shipped", "launched", "built", ...HN_TERMS])) {
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
        summary: post.selftext || post.title,
        signalMetrics: {
          score: post.score || 0,
          comments: post.num_comments || 0,
        },
        discoveredAt: new Date((post.created_utc || 0) * 1000).toISOString(),
      });
    }
  }

  return results;
}

import { getConfig } from "./lib/config.js";
import { fetchGithubReadme, fetchGithubRepo, fetchGithubUser } from "./lib/github.js";
import { latestFile, readJson, writeJson } from "./lib/utils.js";

function safeGithubUsername(item) {
  if (item.source === "github") {
    return item.developer;
  }
  return "";
}

async function enrichLead(item, token) {
  const enriched = { ...item };

  if (item.repo) {
    try {
      const repo = await fetchGithubRepo(item.repo, token);
      const readme = await fetchGithubReadme(item.repo, token);
      enriched.repoStats = {
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        watchers: repo.watchers_count,
        language: repo.language,
        pushedAt: repo.pushed_at,
      };
      enriched.readmeSnippet = readme.slice(0, 4000);
    } catch (error) {
      enriched.repoError = error.message;
    }
  }

  const username = safeGithubUsername(item);
  if (username) {
    try {
      const user = await fetchGithubUser(username, token);
      enriched.githubProfile = {
        login: user.login,
        name: user.name,
        bio: user.bio,
        followers: user.followers,
        publicRepos: user.public_repos,
        blog: user.blog,
        createdAt: user.created_at,
      };
    } catch (error) {
      enriched.profileError = error.message;
    }
  }

  return enriched;
}

async function main() {
  const config = getConfig();
  const inputPath = latestFile("scored-");
  if (!inputPath) {
    throw new Error("No scored file found. Run score first.");
  }

  const scored = readJson(inputPath);
  const qualified = scored.items.filter((item) => item.qualified).slice(0, 25);
  const enrichedItems = [];

  for (const item of qualified) {
    enrichedItems.push(await enrichLead(item, config.githubToken));
  }

  const output = {
    ...scored,
    items: enrichedItems,
  };

  const outputPath = inputPath.replace("\\scored-", "\\enriched-");
  writeJson(outputPath, output);
  console.log(`Saved enriched leads to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

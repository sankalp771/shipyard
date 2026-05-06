import { getConfig } from "./lib/config.js";
import { fetchGithubSignals, fetchHackerNewsSignals, fetchRedditSignals } from "./lib/sources.js";
import { dataFile, isoTimestamp, runIdFromDate, writeJson } from "./lib/utils.js";

async function main() {
  const config = getConfig();
  const runId = runIdFromDate();

  const [hackerNews, github, reddit] = await Promise.all([
    fetchHackerNewsSignals(),
    fetchGithubSignals(config.githubToken),
    fetchRedditSignals(),
  ]);

  const items = [...hackerNews, ...github, ...reddit];
  const output = {
    runId,
    generatedAt: isoTimestamp(),
    sources: {
      hackernews: hackerNews.length,
      github: github.length,
      reddit: reddit.length,
    },
    items,
  };

  const filePath = dataFile(`raw-${runId}.json`);
  writeJson(filePath, output);
  console.log(`Saved raw leads to ${filePath}`);
  console.log(JSON.stringify(output.sources, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

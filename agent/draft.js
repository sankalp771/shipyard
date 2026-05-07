import { getConfig } from "./lib/config.js";
import { generateMessage } from "./lib/llm.js";
import { buildUtmLink, latestFile, readJson, writeJson } from "./lib/utils.js";

function ensureGithubMention(item, draft) {
  if (item.source !== "github" || !item.developer) {
    return draft.trim();
  }

  const mention = `@${item.developer}`;
  const normalized = String(draft || "").trim();
  if (normalized.startsWith(mention)) {
    return normalized;
  }

  return `${mention} ${normalized}`;
}

function buildPrompt(item, utmLink) {
  return [
    "Write a short technical outreach message to a developer.",
    "Constraints:",
    "- 55 words max",
    "- technical, specific, not salesy",
    "- respectful and useful in a GitHub issue thread",
    "- start with @developer exactly",
    "- mention what they shipped",
    "- mention one bottleneck VideoDB likely helps with",
    "- include the link exactly once",
    "- no signoff",
    "- no placeholders",
    "- no mention of ChatGPT or AI assistant",
    "- no exaggeration",
    "- plain text only",
    "",
    `Developer: ${item.developer}`,
    `Source: ${item.source}`,
    `Project: ${item.title}`,
    `Summary: ${item.summary}`,
    `Repo: ${item.repo || "n/a"}`,
    `GitHub bio: ${item.githubProfile?.bio || "n/a"}`,
    `README snippet: ${item.readmeSnippet || "n/a"}`,
    `VideoDB link: ${utmLink}`,
  ].join("\n");
}

async function main() {
  const config = getConfig();
  const inputPath = latestFile("enriched-");
  if (!inputPath) {
    throw new Error("No enriched file found. Run enrich first.");
  }

  const enriched = readJson(inputPath);
  const rankedItems = [...enriched.items].sort((a, b) => {
    const scoreDelta = (b.score || 0) - (a.score || 0);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const tractionA = (a.repoStats?.stars || 0) + (a.repoStats?.watchers || 0);
    const tractionB = (b.repoStats?.stars || 0) + (b.repoStats?.watchers || 0);
    if (tractionB !== tractionA) {
      return tractionB - tractionA;
    }

    return String(b.discoveredAt || "").localeCompare(String(a.discoveredAt || ""));
  });
  const items = config.draftLimit > 0 ? rankedItems.slice(0, config.draftLimit) : rankedItems;
  const draftedItems = [];

  for (const [index, item] of items.entries()) {
    console.log(`Drafting ${index + 1}/${items.length}: ${item.developer} (${item.source})`);
    const utmLink = buildUtmLink(config.videodbBaseUrl, item.source, item.developer, enriched.runId);
    const prompt = buildPrompt(item, utmLink);
    const draft = await generateMessage({
      apiKey: config.llmApiKey,
      apiUrl: config.llmApiUrl,
      model: config.llmModel,
      prompt,
    });

    draftedItems.push({
      ...item,
      utmLink,
      draft: ensureGithubMention(item, draft),
    });
  }

  const output = {
    ...enriched,
    items: draftedItems,
  };

  const outputPath = inputPath.replace("\\enriched-", "\\drafted-");
  writeJson(outputPath, output);
  console.log(`Saved drafted leads to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

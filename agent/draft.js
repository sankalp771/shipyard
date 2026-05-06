import { getConfig } from "./lib/config.js";
import { generateMessage } from "./lib/llm.js";
import { buildUtmLink, latestFile, readJson, writeJson } from "./lib/utils.js";

function buildPrompt(item, utmLink) {
  return [
    "Write a short technical outreach message to a developer.",
    "Constraints:",
    "- 70 words max",
    "- technical, specific, not salesy",
    "- mention what they shipped",
    "- mention one bottleneck VideoDB likely helps with",
    "- include the link exactly once",
    "- sign off without hard selling",
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
  const items = config.draftLimit > 0 ? enriched.items.slice(0, config.draftLimit) : enriched.items;
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
      draft,
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

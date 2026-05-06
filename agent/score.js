import { latestFile, readJson, writeJson } from "./lib/utils.js";

const PROBLEM_TERMS = ["search", "transcription", "audio", "video", "stream", "media", "whisper", "index"];

function includesAny(text, terms) {
  const haystack = String(text || "").toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function scoreLead(item) {
  let score = 0;

  if (includesAny(item.summary, PROBLEM_TERMS) || includesAny(item.title, PROBLEM_TERMS)) {
    score += 3;
  }

  if (includesAny(item.language, ["python", "typescript", "javascript", "go", "rust"])) {
    score += 1;
  }

  const metrics = item.signalMetrics || {};
  if ((metrics.stars || 0) > 0 || (metrics.points || 0) > 5 || (metrics.score || 0) > 5) {
    score += 2;
  }

  if ((metrics.forks || 0) > 0 || (metrics.comments || 0) > 0) {
    score += 1;
  }

  if (item.repo) {
    score += 2;
  }

  if (item.developer && !/bot/i.test(item.developer)) {
    score += 1;
  }

  return Math.min(score, 10);
}

async function main() {
  const inputPath = latestFile("raw-");
  if (!inputPath) {
    throw new Error("No raw lead file found. Run find first.");
  }

  const raw = readJson(inputPath);
  const scoredItems = raw.items.map((item) => ({
    ...item,
    score: scoreLead(item),
    qualified: scoreLead(item) >= 7,
  }));

  const output = {
    ...raw,
    items: scoredItems,
    qualifiedCount: scoredItems.filter((item) => item.qualified).length,
  };

  const outputPath = inputPath.replace("\\raw-", "\\scored-");
  writeJson(outputPath, output);
  console.log(`Saved scored leads to ${outputPath}`);
  console.log(`Qualified: ${output.qualifiedCount}/${scoredItems.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

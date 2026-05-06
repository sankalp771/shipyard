import { getConfig } from "./lib/config.js";
import { appendSheetRows, ensureSheetHeader, getGoogleAccessToken } from "./lib/google.js";
import { latestFile, readJson } from "./lib/utils.js";

async function main() {
  const config = getConfig();
  const inputPath = latestFile("sent-") || latestFile("drafted-");
  if (!inputPath) {
    throw new Error("No sent or drafted file found. Run the pipeline first.");
  }

  const payload = readJson(inputPath);
  const accessToken = await getGoogleAccessToken(config.googleServiceAccountJson);
  await ensureSheetHeader(config.googleSheetId, accessToken);

  const rows = payload.items.map((item) => [
    new Date().toISOString(),
    payload.runId,
    item.source,
    item.developer,
    item.repo || item.url || "",
    item.score ?? "",
    item.delivery?.channel || "draft-only",
    item.delivery?.sent ? "yes" : "no",
    item.utmLink || "",
    item.draft || "",
  ]);

  await appendSheetRows(config.googleSheetId, accessToken, rows);
  console.log(`Tracked ${rows.length} rows to Google Sheets`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import fs from "node:fs";
import path from "node:path";

const ENV_FILES = [".env.local", ".env"];

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

for (const envFile of ENV_FILES) {
  loadDotEnvFile(path.resolve(process.cwd(), envFile));
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getConfig() {
  return {
    githubMainUsername: process.env.GITHUB_MAIN_USERNAME || "",
    githubToken: required("GITHUB_TOKEN"),
    llmApiKey: required("LLM_API_KEY"),
    llmApiUrl: process.env.LLM_API_URL || "https://openrouter.ai/api/v1/chat/completions",
    llmModel: process.env.LLM_MODEL || "openrouter/free",
    googleServiceAccountJson: required("GOOGLE_SERVICE_ACCOUNT_JSON"),
    googleSheetId: required("GOOGLE_SHEET_ID"),
    videodbBaseUrl: process.env.VIDEODB_BASE_URL || "https://videodb.io/",
    enableGithubOutreach: String(process.env.ENABLE_GITHUB_OUTREACH || "false") === "true",
    outreachGithubToken: process.env.OUTREACH_GITHUB_TOKEN || "",
    outreachGithubUsername: process.env.OUTREACH_GITHUB_USERNAME || "",
    draftLimit: Number.parseInt(process.env.DRAFT_LIMIT || "0", 10) || 0,
    liveSendLimit: Number.parseInt(process.env.LIVE_SEND_LIMIT || "0", 10) || 0,
    liveSendMinScore: Number.parseInt(process.env.LIVE_SEND_MIN_SCORE || "8", 10) || 8,
  };
}

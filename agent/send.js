import { getConfig } from "./lib/config.js";
import { createGithubIssueComment, listGithubIssues } from "./lib/github.js";
import { latestFile, readJson, writeJson } from "./lib/utils.js";

async function sendViaGithub(item, config) {
  if (!item.repo) {
    return {
      channel: "none",
      sent: false,
      reason: "No repository available",
    };
  }

  const issues = await listGithubIssues(item.repo, config.outreachGithubToken);
  const target = issues.find((issue) => !issue.pull_request);
  if (!target) {
    return {
      channel: "github",
      sent: false,
      reason: "No open issue or discussion target found",
    };
  }

  await createGithubIssueComment(item.repo, target.number, item.draft, config.outreachGithubToken);
  return {
    channel: "github",
    sent: true,
    targetUrl: target.html_url,
  };
}

async function main() {
  const config = getConfig();
  const inputPath = latestFile("drafted-");
  if (!inputPath) {
    throw new Error("No drafted file found. Run draft first.");
  }

  const drafted = readJson(inputPath);
  const sentItems = [];

  for (const item of drafted.items) {
    let delivery = {
      channel: "dry-run",
      sent: false,
      reason: "Live outreach disabled",
    };

    if (config.enableGithubOutreach && config.outreachGithubToken) {
      delivery = await sendViaGithub(item, config);
    }

    sentItems.push({
      ...item,
      delivery,
    });
  }

  const output = {
    ...drafted,
    items: sentItems,
  };

  const outputPath = inputPath.replace("\\drafted-", "\\sent-");
  writeJson(outputPath, output);
  console.log(`Saved send results to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

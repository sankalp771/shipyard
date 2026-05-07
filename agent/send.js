import { getConfig } from "./lib/config.js";
import { hasBeenContacted, rememberContact } from "./lib/contacted.js";
import { createGithubIssueComment, listGithubIssues } from "./lib/github.js";
import { latestFile, readJson, writeJson } from "./lib/utils.js";

async function sendViaGithub(item, config) {
  if (item.source !== "github") {
    return {
      channel: "none",
      sent: false,
      reason: "Not a GitHub-sourced lead",
    };
  }

  if ((item.score || 0) < config.liveSendMinScore) {
    return {
      channel: "github",
      sent: false,
      reason: `Score below live-send threshold (${config.liveSendMinScore})`,
    };
  }

  if (!item.repo) {
    return {
      channel: "none",
      sent: false,
      reason: "No repository available",
    };
  }

  if (hasBeenContacted(item)) {
    return {
      channel: "github",
      sent: false,
      reason: "Already contacted previously",
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
  let liveSendCount = 0;

  for (const item of drafted.items) {
    let delivery = {
      channel: "dry-run",
      sent: false,
      reason: "Live outreach disabled",
    };

    if (config.enableGithubOutreach && config.outreachGithubToken) {
      if (config.liveSendLimit > 0 && liveSendCount >= config.liveSendLimit) {
        delivery = {
          channel: "github",
          sent: false,
          reason: `Live send limit reached (${config.liveSendLimit})`,
        };
      } else {
        delivery = await sendViaGithub(item, config);
        if (delivery.sent) {
          liveSendCount += 1;
          rememberContact(item, delivery, drafted.runId);
        }
      }
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

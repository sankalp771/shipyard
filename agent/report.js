import fs from "node:fs";
import path from "node:path";

import { readContactHistory } from "./lib/contacted.js";
import { htmlEscape, latestFile, listFiles, readJson, writeJson } from "./lib/utils.js";

const docsDir = path.resolve(process.cwd(), "docs");
const runsDir = path.join(docsDir, "runs");

function ensureDocsDirs() {
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(runsDir, { recursive: true });
}

function summarizeRun(payload) {
  const items = payload.items || [];
  const qualified = items.filter((item) => item.qualified).length;
  const sent = items.filter((item) => item.delivery?.sent).length;
  const skipped = items.filter((item) => item.delivery && !item.delivery.sent).length;

  return {
    runId: payload.runId,
    generatedAt: payload.generatedAt,
    total: items.length,
    qualified,
    sent,
    skipped,
    sources: payload.sources || {},
    items: items.map((item) => ({
      developer: item.developer,
      repo: item.repo || "",
      source: item.source,
      score: item.score || 0,
      qualified: Boolean(item.qualified),
      channel: item.delivery?.channel || "draft-only",
      sent: Boolean(item.delivery?.sent),
      reason: item.delivery?.reason || "",
      targetUrl: item.delivery?.targetUrl || "",
      utmLink: item.utmLink || "",
    })),
  };
}

function renderRunRows(items) {
  return items
    .map(
      (item) => `
        <tr>
          <td>${htmlEscape(item.developer)}</td>
          <td>${htmlEscape(item.repo || item.source)}</td>
          <td>${htmlEscape(String(item.score))}</td>
          <td>${item.sent ? "sent" : "skipped"}</td>
          <td>${htmlEscape(item.reason || item.channel)}</td>
        </tr>`,
    )
    .join("");
}

function renderHistoryRows(history) {
  return history.contacts
    .slice()
    .reverse()
    .map(
      (entry) => `
        <tr>
          <td>${htmlEscape(entry.sentAt)}</td>
          <td>${htmlEscape(entry.developer)}</td>
          <td>${htmlEscape(entry.repo || entry.source)}</td>
          <td>${htmlEscape(entry.channel)}</td>
          <td>${entry.targetUrl ? `<a href="${htmlEscape(entry.targetUrl)}">link</a>` : ""}</td>
        </tr>`,
    )
    .join("");
}

function renderIndex(summary, history, availableRuns) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Growth Agent Log</title>
  <style>
    :root { color-scheme: dark; --bg:#0b1220; --panel:#101a2d; --text:#e6edf7; --muted:#9eb0cb; --accent:#6ee7b7; --line:#22304b; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:ui-sans-serif,system-ui,sans-serif; background:linear-gradient(180deg,#0b1220,#0f172a); color:var(--text); }
    .wrap { max-width:1100px; margin:0 auto; padding:32px 20px 60px; }
    h1,h2 { margin:0 0 12px; }
    p { color:var(--muted); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin:20px 0 28px; }
    .card { background:var(--panel); border:1px solid var(--line); border-radius:16px; padding:16px; }
    .big { font-size:28px; font-weight:700; color:var(--accent); }
    table { width:100%; border-collapse:collapse; background:var(--panel); border:1px solid var(--line); border-radius:16px; overflow:hidden; }
    th,td { text-align:left; padding:12px 14px; border-bottom:1px solid var(--line); vertical-align:top; }
    th { color:var(--muted); font-weight:600; }
    a { color:#93c5fd; text-decoration:none; }
    .section { margin-top:28px; }
    .runs a { display:inline-block; margin:6px 10px 0 0; padding:8px 12px; border:1px solid var(--line); border-radius:999px; background:var(--panel); }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Growth Agent Log</h1>
    <p>Static run history and outreach audit trail for the Shipyard Scanner pipeline.</p>

    <div class="grid">
      <div class="card"><div>Run ID</div><div class="big">${htmlEscape(summary.runId)}</div></div>
      <div class="card"><div>Total leads</div><div class="big">${summary.total}</div></div>
      <div class="card"><div>Qualified</div><div class="big">${summary.qualified}</div></div>
      <div class="card"><div>Sent</div><div class="big">${summary.sent}</div></div>
      <div class="card"><div>Skipped</div><div class="big">${summary.skipped}</div></div>
    </div>

    <div class="card">
      <strong>Sources</strong>
      <p>GitHub: ${summary.sources.github || 0} · Hacker News: ${summary.sources.hackernews || 0} · Reddit: ${summary.sources.reddit || 0}</p>
      <p>Generated at: ${htmlEscape(summary.generatedAt || "")}</p>
    </div>

    <div class="section">
      <h2>Latest Run</h2>
      <table>
        <thead>
          <tr><th>Developer</th><th>Repo/Source</th><th>Score</th><th>Status</th><th>Reason</th></tr>
        </thead>
        <tbody>${renderRunRows(summary.items)}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Contact Memory</h2>
      <table>
        <thead>
          <tr><th>Sent At</th><th>Developer</th><th>Repo</th><th>Channel</th><th>Target</th></tr>
        </thead>
        <tbody>${renderHistoryRows(history)}</tbody>
      </table>
    </div>

    <div class="section runs">
      <h2>Run Files</h2>
      ${availableRuns
        .map((runId) => `<a href="./runs/${htmlEscape(runId)}.json">${htmlEscape(runId)}</a>`)
        .join("")}
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  ensureDocsDirs();

  const latestPath = latestFile("sent-") || latestFile("drafted-");
  if (!latestPath) {
    throw new Error("No sent or drafted file found. Run the pipeline first.");
  }

  const payload = readJson(latestPath);
  const summary = summarizeRun(payload);
  const history = readContactHistory();
  const runIds = listFiles("sent-")
    .map((filePath) => path.basename(filePath).replace(/^sent-/, "").replace(/\.json$/, ""));

  writeJson(path.join(docsDir, "latest.json"), summary);
  writeJson(path.join(runsDir, `${summary.runId}.json`), summary);
  fs.writeFileSync(path.join(docsDir, "index.html"), renderIndex(summary, history, runIds));

  console.log(`Generated static report in ${docsDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

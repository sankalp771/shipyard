import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "agent", "data");
const stateDir = path.resolve(process.cwd(), "agent", "state");

export function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function isoTimestamp() {
  return new Date().toISOString();
}

export function runIdFromDate(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function dataFile(name) {
  ensureDataDir();
  return path.join(dataDir, name);
}

export function ensureStateDir() {
  fs.mkdirSync(stateDir, { recursive: true });
}

export function stateFile(name) {
  ensureStateDir();
  return path.join(stateDir, name);
}

export function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function latestFile(prefix) {
  ensureDataDir();
  const files = fs
    .readdirSync(dataDir)
    .filter((file) => file.startsWith(prefix))
    .sort();
  if (files.length === 0) {
    return null;
  }
  return path.join(dataDir, files[files.length - 1]);
}

export function stageFilePath(inputPath, fromPrefix, toPrefix) {
  const dir = path.dirname(inputPath);
  const file = path.basename(inputPath);
  if (!file.startsWith(fromPrefix)) {
    throw new Error(`Expected file starting with ${fromPrefix}, got ${file}`);
  }

  return path.join(dir, `${toPrefix}${file.slice(fromPrefix.length)}`);
}

export function listFiles(prefix) {
  ensureDataDir();
  return fs
    .readdirSync(dataDir)
    .filter((file) => file.startsWith(prefix))
    .sort()
    .map((file) => path.join(dataDir, file));
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function buildUtmLink(baseUrl, source, developer, runId) {
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "outreach");
  url.searchParams.set("utm_campaign", "shipyard_scanner");
  url.searchParams.set("utm_dev", slugify(developer));
  url.searchParams.set("utm_run", runId);
  return url.toString();
}

export function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

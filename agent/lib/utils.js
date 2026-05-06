import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "agent", "data");

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

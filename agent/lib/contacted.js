import fs from "node:fs";

import { isoTimestamp, listFiles, readJson, slugify, stateFile, writeJson } from "./utils.js";

const CONTACTED_FILE = stateFile("contacted.json");
const DEFAULT_STATE = {
  contacts: [],
};

function loadState() {
  if (!fs.existsSync(CONTACTED_FILE)) {
    return buildStateFromSentHistory();
  }

  return JSON.parse(fs.readFileSync(CONTACTED_FILE, "utf8"));
}

function saveState(state) {
  writeJson(CONTACTED_FILE, state);
}

function buildStateFromSentHistory() {
  const state = { ...DEFAULT_STATE, contacts: [] };
  const sentFiles = listFiles("sent-");

  for (const filePath of sentFiles) {
    const payload = readJson(filePath);
    for (const item of payload.items || []) {
      if (!item.delivery?.sent) {
        continue;
      }

      state.contacts.push({
        key: contactKey(item),
        developer: item.developer || "",
        repo: item.repo || "",
        source: item.source || "",
        score: item.score || 0,
        runId: payload.runId,
        sentAt: payload.generatedAt || isoTimestamp(),
        targetUrl: item.delivery?.targetUrl || "",
        channel: item.delivery?.channel || "",
      });
    }
  }

  saveState(state);
  return state;
}

function contactKey(item) {
  const repo = slugify(item.repo || "");
  const developer = slugify(item.developer || "");
  return repo ? `repo:${repo}` : `developer:${developer}`;
}

export function hasBeenContacted(item) {
  const state = loadState();
  const key = contactKey(item);
  return state.contacts.some((entry) => entry.key === key);
}

export function rememberContact(item, delivery, runId) {
  const state = loadState();
  const key = contactKey(item);

  const existing = state.contacts.find((entry) => entry.key === key);
  const payload = {
    key,
    developer: item.developer || "",
    repo: item.repo || "",
    source: item.source || "",
    score: item.score || 0,
    runId,
    sentAt: isoTimestamp(),
    targetUrl: delivery?.targetUrl || "",
    channel: delivery?.channel || "",
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    state.contacts.push(payload);
  }

  saveState(state);
}

export function readContactHistory() {
  return loadState();
}

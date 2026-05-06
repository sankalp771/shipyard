import crypto from "node:crypto";
import fs from "node:fs";

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signJwt(payload, serviceAccount) {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key, "base64");
  return `${unsigned}.${signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")}`;
}

export async function getGoogleAccessToken(serviceAccountPath) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(
    {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: serviceAccount.token_uri,
      exp: now + 3600,
      iat: now,
    },
    serviceAccount,
  );

  const response = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token failed ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function appendSheetRows(sheetId, accessToken, rows) {
  const sheetName = await getPrimarySheetName(sheetId, accessToken);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: rows,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Sheets append failed ${response.status}: ${text}`);
  }

  return response.json();
}

export async function ensureSheetHeader(sheetId, accessToken) {
  const sheetName = await getPrimarySheetName(sheetId, accessToken);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A1:J1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [[
          "Timestamp",
          "Run ID",
          "Source",
          "Developer",
          "Repo",
          "Score",
          "Channel",
          "Sent",
          "UTM Link",
          "Draft",
        ]],
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Sheets header failed ${response.status}: ${text}`);
  }

  return response.json();
}

export async function getPrimarySheetName(sheetId, accessToken) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Sheets metadata failed ${response.status}: ${text}`);
  }

  const data = await response.json();
  const firstSheet = data.sheets?.[0]?.properties?.title;
  if (!firstSheet) {
    throw new Error("No sheet tabs found in spreadsheet");
  }

  return firstSheet;
}

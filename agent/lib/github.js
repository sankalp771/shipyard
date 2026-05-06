export async function githubRequest(pathname, token) {
  const response = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "growth-agent",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub request failed ${response.status}: ${text}`);
  }

  return response.json();
}

export async function fetchGithubUser(username, token) {
  return githubRequest(`/users/${encodeURIComponent(username)}`, token);
}

export async function fetchGithubRepo(fullName, token) {
  return githubRequest(`/repos/${fullName}`, token);
}

export async function fetchGithubReadme(fullName, token) {
  const response = await fetch(`https://api.github.com/repos/${fullName}/readme`, {
    headers: {
      Accept: "application/vnd.github.raw+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "growth-agent",
    },
  });

  if (response.status === 404) {
    return "";
  }

  if (!response.ok) {
    throw new Error(`GitHub README failed ${response.status}`);
  }

  return response.text();
}

export async function listGithubIssues(fullName, token) {
  return githubRequest(`/repos/${fullName}/issues?state=open&per_page=10`, token);
}

export async function createGithubIssueComment(fullName, issueNumber, body, token) {
  const response = await fetch(
    `https://api.github.com/repos/${fullName}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "growth-agent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub comment failed ${response.status}: ${text}`);
  }

  return response.json();
}

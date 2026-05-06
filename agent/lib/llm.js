function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateMessage({ apiKey, apiUrl, model, prompt, attempt = 1 }) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    if (response.status === 429 && attempt < 6) {
      const waitSeconds = Number(data.retryAfter || 10);
      console.log(`LLM rate limited. Waiting ${waitSeconds}s before retry ${attempt + 1}...`);
      await sleep((waitSeconds + 1) * 1000);
      return generateMessage({ apiKey, apiUrl, model, prompt, attempt: attempt + 1 });
    }

    throw new Error(`LLM request failed ${response.status}: ${JSON.stringify(data)}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (content) {
    return String(content).trim();
  }

  throw new Error(`LLM request failed: ${JSON.stringify(data)}`);
}

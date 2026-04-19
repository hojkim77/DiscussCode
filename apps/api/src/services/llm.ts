import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT =
  "You are a concise technical summarizer for a developer discussion platform called DiscussCode. " +
  "Summarize in 2-3 sentences, focusing on the key technical aspects and why developers care. " +
  "Be factual and neutral. Output plain text only.";

export async function generateSummary(
  title: string,
  body: string | null,
  maxTokens = 200
): Promise<string> {
  const content = [
    `Title: ${title}`,
    body ? `\nContent:\n${body.slice(0, 3000)}` : "",
  ]
    .filter(Boolean)
    .join("");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text.trim() : "";
}

export async function decodeReadme(base64Content: string): Promise<string> {
  const decoded = Buffer.from(base64Content, "base64").toString("utf-8");
  // Trim to first 6000 chars to keep token usage reasonable
  return decoded.slice(0, 6000);
}

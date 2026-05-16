import { createServerFn } from "@tanstack/react-start";

export const analyzeWithLovable = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt: string }) => input)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      throw new Error("LOVABLE_API_KEY is not configured on the server.");
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: data.prompt }],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Lovable AI fallback failed (${res.status}): ${t.substring(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    return { content, model: "google/gemini-3-flash-preview (Lovable AI)" };
  });

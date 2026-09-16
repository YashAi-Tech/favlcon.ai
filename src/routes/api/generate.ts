import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const SYSTEM = `You are a senior product designer and front-end engineer.
Return ONE complete, self-contained HTML document that renders a beautiful, modern, responsive website for the user's request.

Hard rules:
- Output ONLY raw HTML. No markdown fences, no commentary.
- Everything inline: <style> in <head>, any JS in <script>. No external files except Google Fonts and https://cdn.tailwindcss.com.
- Use a distinctive, cohesive visual direction (no generic purple-on-white templates).
- Use real, specific copy — never lorem ipsum.
- Images: use https://images.unsplash.com/... URLs or CSS gradients.
- Make it fully responsive and accessible.
If an image is attached, treat it as the design/content reference and match its layout, palette and structure closely.`;

function stripFences(text: string) {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? text;
  return body.trim();
}

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return Response.json(
            { error: "AI is not configured for this app yet." },
            { status: 500 },
          );
        }

        const { prompt, image } = (await request.json()) as {
          prompt?: string;
          image?: string | null;
        };

        if (!prompt || !prompt.trim()) {
          return Response.json({ error: "Please describe what to build." }, { status: 400 });
        }

        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: {
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          },
        });

        const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
        if (image && image.startsWith("data:image/")) {
          content.push({ type: "image", image });
        }

        try {
          const result = streamText({
            model: lovable.responses("openai/gpt-6-astra"),
            system: SYSTEM,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            messages: [{ role: "user", content: content as any }],
            providerOptions: {
              openai: {
                store: false,
                forceReasoning: true,
                reasoningEffort: "low",
                reasoningSummary: "auto",
                include: ["reasoning.encrypted_content"],
              },
            },
            abortSignal: request.signal,
          });

          const text = await result.text;
          const html = stripFences(text);
          if (!html) {
            return Response.json(
              { error: "The AI returned an empty result. Try again with more detail." },
              { status: 502 },
            );
          }
          return Response.json({ html });
        } catch (error) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          const message = error instanceof Error ? error.message : "Generation failed.";
          const status = /402|credit/i.test(message) ? 402 : 500;
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});

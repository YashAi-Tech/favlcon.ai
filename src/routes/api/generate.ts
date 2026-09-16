import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const SYSTEM = `You are an elite front-end engineer and art director. You build complete, highly graphical, animated MULTI-PAGE React websites.

Reply in EXACTLY this format, nothing else:

<<<TITLE>>>
Site name
<<<SLUG>>>
kebab-case-slug
<<<DESCRIPTION>>>
One sentence describing the site.
<<<CODE>>>
(JSX only)

CODE rules — the JSX runs in the browser via Babel, so:
- NO import/export statements, NO TypeScript, NO markdown fences.
- React and the hooks useState, useEffect, useRef, useMemo, useCallback are already in scope.
- A helper "useHashRoute()" is in scope: const [route, go] = useHashRoute(); route is like "/" or "/about"; call go("/about") to navigate.
- You MUST define "function App() { ... }" as the root component. It renders a shared header nav + footer and switches between at least 4 distinct page components (e.g. Home, About/Services, Work/Features, Contact) based on route.
- Every page is rich and graphical: big hero, layered gradients, glassmorphism, grid/bento sections, testimonials, stats, FAQ, CTA, real specific copy (never lorem ipsum).
- Tailwind (CDN) is available for all styling. Use it heavily and cohesively; pick a bold distinctive palette (avoid generic purple-on-white).
- Animation is required: use the ready-made classes "anim-fade-up", "anim-float", "anim-shimmer", and "reveal" (reveal elements animate in on scroll automatically), plus Tailwind transitions/hover effects and CSS keyframes in inline <style> if needed.
- Add interactivity: mobile menu toggle, accordions, tabs, carousels, hover states, working contact form with local state.
- Images: use https://images.unsplash.com/... URLs or pure CSS gradients/SVG.
- Must be fully responsive and accessible (alt text, buttons, labels).
- Self-contained: no external JS libraries beyond what is in scope.`;

function section(text: string, tag: string, next?: string) {
  const start = text.indexOf(`<<<${tag}>>>`);
  if (start === -1) return "";
  const from = start + tag.length + 6;
  const end = next ? text.indexOf(`<<<${next}>>>`, from) : -1;
  return text.slice(from, end === -1 ? undefined : end).trim();
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "site"
  );
}

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lovableKey = process.env["LOVABLE_API_KEY"];
        const openaiKey = process.env["OPENAI_API_KEY"];
        const key = lovableKey || openaiKey;

        if (!key) {
          return Response.json(
            { error: "AI is not configured for this app yet. Please set LOVABLE_API_KEY or OPENAI_API_KEY in your environment variables." },
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

        const ai = lovableKey
          ? createOpenAI({
              baseURL: "https://ai.gateway.lovable.dev/v1",
              apiKey: lovableKey,
              headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
            })
          : createOpenAI({
              apiKey: openaiKey,
            });

        const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
        if (image && image.startsWith("data:image/")) {
          content.push({ type: "image", image });
        }

        try {
          const model = lovableKey
            ? ai.responses("openai/gpt-6-astra")
            : ai("gpt-4o");

          const result = streamText({
            model,
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
          const title = section(text, "TITLE", "SLUG") || "Untitled site";
          const slug = slugify(section(text, "SLUG", "DESCRIPTION") || title);
          const description = section(text, "DESCRIPTION", "CODE");
          const code = section(text, "CODE").replace(/^```(?:jsx|js|tsx)?\s*|```$/g, "").trim();

          if (!code.includes("function App")) {
            return Response.json(
              { error: "The AI returned an unusable result. Try again with more detail." },
              { status: 502 },
            );
          }

          return Response.json({ title, slug, description, code });
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

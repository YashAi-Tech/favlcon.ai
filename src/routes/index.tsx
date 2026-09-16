import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowUp,
  Code2,
  Eye,
  ImagePlus,
  Loader2,
  Monitor,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Promptsmith — Build a website from a prompt and an image" },
      {
        name: "description",
        content:
          "Describe your idea, drop in a reference image, and watch a complete website appear as a live preview in seconds.",
      },
      { property: "og:title", content: "Promptsmith — Prompt to live website" },
      {
        property: "og:description",
        content:
          "Describe your idea, drop in a reference image, and watch a complete website appear as a live preview in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const IDEAS = [
  "A landing page for a specialty coffee roastery",
  "A portfolio for a freelance motion designer",
  "A pricing page for an AI note-taking app",
];

function Index() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const fileRef = useRef<HTMLInputElement>(null);

  function pickImage(file?: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function generate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setHtml(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, image }),
      });
      const data = (await res.json()) as { html?: string; error?: string };
      if (!res.ok || !data.html) throw new Error(data.error ?? "Something went wrong.");
      setHtml(data.html);
      setTab("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--glow)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(var(--grid)_1px,transparent_1px),linear-gradient(90deg,var(--grid)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-5 py-16 sm:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs tracking-wide text-muted-foreground backdrop-blur">
          <Sparkles className="size-3.5 text-accent" />
          Prompt to real website
        </span>

        <h1 className="mt-6 text-center text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Describe it. <span className="text-accent">See it live.</span>
        </h1>
        <p className="mt-4 max-w-xl text-center text-base text-muted-foreground">
          Write a prompt, attach a reference image if you have one, and get a finished website you
          can preview instantly.
        </p>

        <div className="mt-10 w-full rounded-2xl border border-border/80 bg-card/80 p-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
          {image && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/50 p-2">
              <img src={image} alt="Reference" className="size-14 rounded-lg object-cover" />
              <span className="flex-1 text-sm text-muted-foreground">Reference image attached</span>
              <button
                onClick={() => setImage(null)}
                aria-label="Remove image"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
            }}
            rows={3}
            placeholder="Build a landing page for..."
            className="w-full resize-none bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground/70"
          />

          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ImagePlus className="size-4" />
              Image
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pickImage(e.target.files?.[0])}
            />

            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
              {loading ? "Building" : "Build it"}
            </button>
          </div>
        </div>

        {!html && !loading && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {IDEAS.map((idea) => (
              <button
                key={idea}
                onClick={() => setPrompt(idea)}
                className="rounded-full border border-border/70 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent/60 hover:text-foreground"
              >
                {idea}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
            {error}
          </p>
        )}
      </div>

      {(loading || html) && (
        <section className="relative mx-auto w-full max-w-6xl px-5 pb-20">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/80 backdrop-blur">
            <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
              <div className="flex gap-1">
                <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>
                  <Eye className="size-4" /> Preview
                </TabButton>
                <TabButton active={tab === "code"} onClick={() => setTab("code")}>
                  <Code2 className="size-4" /> Code
                </TabButton>
              </div>
              <div className="flex gap-1">
                <TabButton active={device === "desktop"} onClick={() => setDevice("desktop")}>
                  <Monitor className="size-4" />
                </TabButton>
                <TabButton active={device === "mobile"} onClick={() => setDevice("mobile")}>
                  <Smartphone className="size-4" />
                </TabButton>
              </div>
            </div>

            {loading ? (
              <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-accent" />
                <p className="text-sm">Designing and building your site…</p>
              </div>
            ) : tab === "preview" ? (
              <div className="flex justify-center bg-secondary/30 p-3">
                <iframe
                  title="Website preview"
                  srcDoc={html ?? ""}
                  sandbox="allow-scripts"
                  className={`h-[70vh] rounded-xl border border-border/60 bg-white ${
                    device === "mobile" ? "w-[390px]" : "w-full"
                  }`}
                />
              </div>
            ) : (
              <pre className="h-[70vh] overflow-auto bg-secondary/30 p-4 text-xs leading-relaxed text-muted-foreground">
                <code>{html}</code>
              </pre>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

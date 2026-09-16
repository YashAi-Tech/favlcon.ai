import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  Code2,
  ExternalLink,
  Eye,
  Globe,
  ImagePlus,
  Loader2,
  Monitor,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildSiteHtml } from "@/lib/site-runtime";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Promptsmith — Turn a prompt into a live multi-page website" },
      {
        name: "description",
        content:
          "Describe your idea, add a reference image, and publish an animated multi-page React website to its own live link in seconds.",
      },
      { property: "og:title", content: "Promptsmith — Prompt to live website" },
      {
        property: "og:description",
        content:
          "Describe your idea, add a reference image, and publish an animated multi-page React website to its own live link in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Generated = { title: string; slug: string; description: string; code: string };

const IDEAS = [
  "An animated site for a specialty coffee roastery",
  "A studio portfolio for a motion designer",
  "A product site for an AI note-taking app",
];

function Index() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [site, setSite] = useState<Generated | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [liveSlug, setLiveSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const fileRef = useRef<HTMLInputElement>(null);

  const recent = useQuery({
    queryKey: ["recent-sites", liveSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("slug, title, description")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

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
    setSite(null);
    setLiveSlug(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, image }),
      });
      const data = (await res.json()) as Partial<Generated> & { error?: string };
      if (!res.ok || !data.code) throw new Error(data.error ?? "Something went wrong.");
      setSite(data as Generated);
      setTab("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    if (!site || publishing) return;
    setPublishing(true);
    setError(null);
    try {
      let slug = site.slug;
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = attempt === 0 ? slug : `${site.slug}-${Math.random().toString(36).slice(2, 6)}`;
        const { error } = await supabase.from("sites").insert({
          slug: candidate,
          title: site.title,
          description: site.description,
          prompt,
          code: site.code,
        });
        if (!error) {
          slug = candidate;
          setLiveSlug(candidate);
          recent.refetch();
          return;
        }
        if (error.code !== "23505") throw error;
      }
      throw new Error("Could not find a free link name. Try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publishing failed.");
    } finally {
      setPublishing(false);
    }
  }

  const liveUrl = liveSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/s/${liveSlug}`
    : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--glow)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(var(--grid)_1px,transparent_1px),linear-gradient(90deg,var(--grid)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-5 py-16 sm:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs tracking-wide text-muted-foreground backdrop-blur">
          <Sparkles className="size-3.5 text-accent" />
          Prompt to a live, animated website
        </span>

        <h1 className="mt-6 text-center text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Describe it. <span className="text-accent">Publish it live.</span>
        </h1>
        <p className="mt-4 max-w-xl text-center text-base text-muted-foreground">
          Write a prompt, attach a reference image, and get a multi-page animated website you can
          publish to its own link in one click.
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
            placeholder="Build a multi-page site for..."
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

        {!site && !loading && (
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
          <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
            {error}
          </p>
        )}
      </div>

      {(loading || site) && (
        <section className="relative mx-auto w-full max-w-6xl px-5 pb-10">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/80 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
              <div className="flex gap-1">
                <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>
                  <Eye className="size-4" /> Preview
                </TabButton>
                <TabButton active={tab === "code"} onClick={() => setTab("code")}>
                  <Code2 className="size-4" /> Code
                </TabButton>
              </div>
              <div className="flex items-center gap-1">
                <TabButton active={device === "desktop"} onClick={() => setDevice("desktop")}>
                  <Monitor className="size-4" />
                </TabButton>
                <TabButton active={device === "mobile"} onClick={() => setDevice("mobile")}>
                  <Smartphone className="size-4" />
                </TabButton>
                {site && (
                  <button
                    onClick={publish}
                    disabled={publishing || !!liveSlug}
                    className="ml-2 inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {publishing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : liveSlug ? (
                      <Check className="size-4" />
                    ) : (
                      <Globe className="size-4" />
                    )}
                    {liveSlug ? "Live" : publishing ? "Publishing" : "Publish live"}
                  </button>
                )}
              </div>
            </div>

            {liveUrl && (
              <div className="flex flex-wrap items-center gap-3 border-b border-border/70 bg-accent/10 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Your site is live at</span>
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
                >
                  {liveUrl}
                  <ExternalLink className="size-3.5" />
                </a>
                <button
                  onClick={() => navigator.clipboard?.writeText(liveUrl)}
                  className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Copy link
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-accent" />
                <p className="text-sm">Designing pages, animations and content…</p>
              </div>
            ) : tab === "preview" ? (
              <div className="flex justify-center bg-secondary/30 p-3">
                <iframe
                  title="Website preview"
                  srcDoc={site ? buildSiteHtml(site) : ""}
                  sandbox="allow-scripts allow-forms allow-popups"
                  className={`h-[70vh] rounded-xl border border-border/60 bg-white ${
                    device === "mobile" ? "w-[390px]" : "w-full"
                  }`}
                />
              </div>
            ) : (
              <pre className="h-[70vh] overflow-auto bg-secondary/30 p-4 text-xs leading-relaxed text-muted-foreground">
                <code>{site?.code}</code>
              </pre>
            )}
          </div>
        </section>
      )}

      {(recent.data?.length ?? 0) > 0 && (
        <section className="relative mx-auto w-full max-w-6xl px-5 pb-20">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Recently published
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.data?.map((s) => (
              <Link
                key={s.slug}
                to="/s/$slug"
                params={{ slug: s.slug }}
                className="group rounded-xl border border-border/70 bg-card/70 p-4 transition-colors hover:border-accent/60"
              >
                <p className="font-medium text-foreground">{s.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  /s/{s.slug} <ExternalLink className="size-3" />
                </span>
              </Link>
            ))}
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

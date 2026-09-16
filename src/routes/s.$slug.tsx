import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildSiteHtml } from "@/lib/site-runtime";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/s/$slug")({
  head: () => ({
    meta: [
      { title: "Live site — Promptsmith" },
      { name: "description", content: "A website generated from a prompt, live on its own link." },
      { property: "og:title", content: "Live site — Promptsmith" },
      {
        property: "og:description",
        content: "A website generated from a prompt, live on its own link.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveSite,
});

function LiveSite() {
  const { slug } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["site", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("title, description, code")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">This site doesn't exist</h1>
        <p className="text-sm text-muted-foreground">
          The link may be wrong, or the site was never published.
        </p>
        <Link
          to="/"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Build your own
        </Link>
      </div>
    );
  }

  return (
    <iframe
      title={data.title}
      srcDoc={buildSiteHtml({
        title: data.title,
        description: data.description ?? "",
        code: data.code,
      })}
      sandbox="allow-scripts allow-forms allow-popups"
      className="h-screen w-screen border-0 bg-white"
    />
  );
}

export type GeneratedSite = {
  title: string;
  description: string;
  code: string;
};

/**
 * Wraps generated JSX into a complete, standalone HTML document that runs
 * React (with hash-based multi-page routing), Tailwind and animations
 * directly in the browser — no build step needed.
 */
export function buildSiteHtml(site: GeneratedSite) {
  const safeTitle = site.title.replace(/</g, "&lt;");
  const safeDescription = site.description.replace(/"/g, "&quot;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}" />
<script src="https://cdn.tailwindcss.com"></script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
<style>
  html { scroll-behavior: smooth; }
  body { margin: 0; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
  @keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
  @keyframes shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
  .anim-fade-up { animation: fadeUp .7s cubic-bezier(.22,1,.36,1) both; }
  .anim-float { animation: floaty 6s ease-in-out infinite; }
  .anim-shimmer { background-size: 200% 200%; animation: shimmer 6s linear infinite; }
  .reveal { opacity: 0; transform: translateY(28px); transition: opacity .8s ease, transform .8s cubic-bezier(.22,1,.36,1); }
  .reveal.is-visible { opacity: 1; transform: none; }
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react">
const { useState, useEffect, useRef, useMemo, useCallback } = React;

function useHashRoute() {
  const read = () => (window.location.hash || "#/").replace(/^#/, "") || "/";
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => { setRoute(read()); window.scrollTo({ top: 0 }); };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return [route, (next) => { window.location.hash = next.startsWith("/") ? "#" + next : "#/" + next; }];
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-visible")),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

${site.code}

function __Boot() {
  useReveal();
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<__Boot />);
</script>
</body>
</html>`;
}

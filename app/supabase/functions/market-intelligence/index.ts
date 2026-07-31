import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface RequestBody {
  scopeKey: string;
  scopeLabel: string;
  kpis: Record<string, unknown>;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { scopeKey, scopeLabel, kpis } = (await req.json()) as RequestBody;
    if (!scopeKey || !scopeLabel) {
      return json({ error: "scopeKey and scopeLabel are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cached } = await supabase
      .from("insight_cache")
      .select("insight, citations, generated_at")
      .eq("scope_key", scopeKey)
      .maybeSingle();

    if (cached && Date.now() - new Date(cached.generated_at).getTime() < CACHE_TTL_MS) {
      return json({ ...cached, cached: true });
    }

    const tavilyResults = await tavilySearch(scopeLabel);
    const { insight, citations } = await generateInsight(scopeLabel, kpis, tavilyResults);

    const generatedAt = new Date().toISOString();
    await supabase.from("insight_cache").upsert({
      scope_key: scopeKey,
      scope_label: scopeLabel,
      insight,
      citations,
      generated_at: generatedAt,
    });

    return json({ insight, citations, generated_at: generatedAt, cached: false });
  } catch (err) {
    console.error(err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function tavilySearch(scopeLabel: string): Promise<TavilyResult[]> {
  const apiKey = Deno.env.get("TAVILY_API_KEY");
  if (!apiKey) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: `${scopeLabel} trade outlook 2025 2026 news analysis`,
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
    }),
  });

  if (!res.ok) {
    console.error("Tavily error", res.status, await res.text());
    return [];
  }

  const data = await res.json();
  return (data.results ?? []).map((r: TavilyResult) => ({
    title: r.title,
    url: r.url,
    content: (r.content || "").slice(0, 600),
  }));
}

async function generateInsight(
  scopeLabel: string,
  kpis: Record<string, unknown>,
  sources: TavilyResult[]
): Promise<{ insight: string; citations: { n: number; title: string; url: string }[] }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return { insight: "Market intelligence is not configured.", citations: [] };
  }

  const sourcesBlock = sources
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.content}`)
    .join("\n\n");

  const prompt = `You are a trade market analyst writing a concise briefing for "${scopeLabel}".

Current dataset KPIs (BACI trade data, values in USD, volumes in metric tons):
${JSON.stringify(kpis, null, 2)}

Recent web sources:
${sourcesBlock || "(no external sources available)"}

Write a professional 3-paragraph market intelligence briefing about ${scopeLabel}'s trade
position. Ground the headline figures in the KPIs given. Where you use information from a
web source, cite it inline with its bracketed number, e.g. [1], [2]. Do not fabricate
numbers not present in the KPIs or sources. Output plain paragraphs only — no title, no
markdown headings, no bullet lists. Start directly with the first sentence of analysis.
Keep the whole response under 280 words so it finishes within the token budget.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Anthropic error", res.status, errText);
    return { insight: "Unable to generate insights right now. Please try again shortly.", citations: [] };
  }

  const data = await res.json();
  const insight = (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
  const citations = sources.map((s, i) => ({ n: i + 1, title: s.title, url: s.url }));

  return { insight, citations };
}

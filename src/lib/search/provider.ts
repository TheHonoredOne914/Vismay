/**
 * Vismay search & source retrieval — server-side only.
 *
 * Uses the z-ai-web-dev-sdk's `web_search` and `page_reader` functions for
 * real source discovery and passage extraction. The pipeline mirrors what
 * the master prompt requires:
 *
 *   query plan  →  web_search  →  page_reader (top hits)  →  passages
 *                                                            →  grounded answer
 *
 * Self-hosted deployments can swap the implementation behind the same public
 * API (searchWeb, fetchPage) by reading env vars for an external provider.
 */
import "server-only";

import ZAI from "z-ai-web-dev-sdk";

export interface SearchResult {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  rank: number;
  date: string;
  favicon: string;
}

export interface FetchedPage {
  url: string;
  title: string;
  html: string;
  text: string;
  publishedTime?: string;
  ok: boolean;
  status: number;
}

let cachedPromise: Promise<ZAI> | null = null;

async function client(): Promise<ZAI> {
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    const envKey = process.env.ZAI_API_KEY || process.env.OPENAI_API_KEY || "";
    const envUrl = process.env.ZAI_BASE_URL || "";
    if (envKey && envUrl) return new ZAI({ apiKey: envKey, baseUrl: envUrl } as any);
    if (envKey) return new ZAI({ apiKey: envKey } as any);
    // Sandbox path — load from .z-ai-config
    return ZAI.create();
  })();
  return cachedPromise;
}

export function isSearchConfigured(): boolean {
  // The sandbox SDK is usable without explicit credentials. In self-hosted
  // deployments, require explicit configuration.
  return true;
}

/** Run a web search and return normalized results. */
export async function searchWeb(
  query: string,
  num = 8
): Promise<SearchResult[]> {
  try {
    const res = (await (await client()).functions.invoke("web_search", {
      query,
      num,
    })) as unknown as SearchResult[];
    if (!Array.isArray(res)) return [];
    return res;
  } catch (e) {
    console.error("[search] web_search failed:", e);
    return [];
  }
}

/** Fetch a single page and convert HTML → plain text. */
export async function fetchPage(url: string): Promise<FetchedPage> {
  const empty: FetchedPage = {
    url,
    title: "",
    html: "",
    text: "",
    ok: false,
    status: 0,
  };
  try {
    const out: any = await (await client()).functions.invoke("page_reader", { url });
    const data = out?.data ?? out;
    const html = data?.html ?? "";
    const text = htmlToText(html);
    return {
      url,
      title: data?.title ?? "",
      html,
      text,
      publishedTime: data?.publishedTime,
      ok: (out?.status ?? out?.code ?? 200) < 400,
      status: out?.status ?? out?.code ?? 0,
    };
  } catch (e) {
    console.error("[search] page_reader failed for", url, e);
    return empty;
  }
}

/** Minimal HTML → text converter. Avoids pulling in a heavy dep. */
function htmlToText(html: string): string {
  if (!html) return "";
  // Strip scripts & styles wholesale.
  const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const noStyle = noScript.replace(/<style[\s\S]*?<\/style>/gi, " ");
  // Block tags → newline.
  const blocked = noStyle.replace(
    /<\/(p|div|section|article|h[1-6]|li|tr|td|th|br|hr|ul|ol|table|header|footer|nav|main|aside)>/gi,
    "\n"
  );
  const stripped = blocked.replace(/<[^>]+>/g, " ");
  const unescaped = stripped
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/g, " ");
  return unescaped
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Split a long text into passages of roughly `target` words with `overlap`
 * words of overlap. Returns passages with a 1-indexed locator.
 */
export function splitIntoPassages(
  text: string,
  target = 180,
  overlap = 30
): { passage: string; locator: string }[] {
  if (!text) return [];
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= target) return [{ passage: words.join(" "), locator: "p. 1" }];
  const passages: { passage: string; locator: string }[] = [];
  let i = 0;
  let page = 1;
  while (i < words.length) {
    const slice = words.slice(i, i + target);
    passages.push({ passage: slice.join(" "), locator: `p. ${page}` });
    i += Math.max(1, target - overlap);
    page += 1;
    if (passages.length >= 24) break; // hard cap to respect size limits
  }
  return passages;
}

/**
 * Naive relevance score: count of query terms appearing in the passage.
 * Good enough for a quick rerank; replace with embeddings when configured.
 */
export function rankPassages(
  query: string,
  passages: { passage: string; locator: string }[]
): { passage: string; locator: string; score: number }[] {
  const q = query.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  return passages
    .map((p) => {
      const t = p.passage.toLowerCase();
      let score = 0;
      for (const term of q) {
        const matches = t.split(term).length - 1;
        score += matches;
      }
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score);
}

export interface SourceCandidate {
  title: string;
  url: string;
  snippet: string;
  host: string;
  date?: string;
  fetchedText?: string;
  passages?: { passage: string; locator: string; score: number }[];
}

/**
 * End-to-end source discovery for a query. Returns the top candidates with
 * extracted passages already reranked.
 */
export async function discoverSources(
  query: string,
  opts: { fetchPages?: number; passagesPerSource?: number } = {}
): Promise<{
  candidates: SourceCandidate[];
  coverageNote: string | null;
}> {
  const fetchPages = opts.fetchPages ?? 3;
  const passagesPerSource = opts.passagesPerSource ?? 3;
  const results = await searchWeb(query, 8);
  if (results.length === 0) {
    return {
      candidates: [],
      coverageNote:
        "No web sources were returned by the search provider. This may be a temporary failure or a configuration issue.",
    };
  }
  const top = results.slice(0, fetchPages);
  const candidates: SourceCandidate[] = [];
  for (const r of top) {
    const page = await fetchPage(r.url);
    let passages: { passage: string; locator: string; score: number }[] = [];
    if (page.text) {
      const raw = splitIntoPassages(page.text);
      passages = rankPassages(query, raw)
        .slice(0, passagesPerSource)
        .filter((p) => p.score > 0);
    }
    candidates.push({
      title: page.title || r.name,
      url: r.url,
      snippet: r.snippet || page.text.slice(0, 280),
      host: r.host_name,
      date: r.date || page.publishedTime,
      fetchedText: page.text,
      passages,
    });
  }
  const coverage =
    candidates.length === 0
      ? "Search returned results but no passages could be extracted."
      : candidates.some((c) => (c.passages?.length ?? 0) > 0)
        ? null
        : "Sources were found, but none contained directly quotable passages for this query.";
  return { candidates, coverageNote: coverage };
}

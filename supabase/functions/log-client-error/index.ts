import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": /^https:\/\/([a-z0-9-]+\.)?greenskeeper\.studio$/.test(origin)
      ? origin : "https://tourney.greenskeeper.studio",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const headers = cors(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers });

  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers });

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400, headers }); }

  const { type, message, source, stack, url } = body;
  if (!message && !type) return new Response("ok", { status: 200, headers });

  const title = `[auto] ${type ?? "error"}: ${(message ?? "").slice(0, 120)}`;
  const description = [
    source ? `Source: ${source}` : null,
    url    ? `Page: ${url}`   : null,
    stack  ? `\n${stack.slice(0, 1200)}` : null,
  ].filter(Boolean).join("\n");

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Dedup: skip if identical title+url logged in last 10 min
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: existing } = await sb
    .from("platform_bugs")
    .select("id")
    .eq("title", title)
    .eq("url", url ?? "")
    .gte("created_at", since)
    .limit(1);

  if (existing && existing.length > 0) {
    return new Response(JSON.stringify({ ok: true, deduped: true }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
  }

  await sb.from("platform_bugs").insert({
    email: "system@tourney",
    title,
    description,
    url: url ?? "",
    status: "open",
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
});

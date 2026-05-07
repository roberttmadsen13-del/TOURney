import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PLATFORM_OWNER   = Deno.env.get("PLATFORM_OWNER_EMAIL") ?? "robert.t.madsen13@gmail.com";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY         = Deno.env.get("SUPABASE_ANON_KEY")!;

function allowedOrigin(req: Request): string {
  const o = req.headers.get("Origin") ?? "";
  return /^https:\/\/([a-z0-9-]+\.)?greenskeeper\.studio$/.test(o) ? o : "https://tourney.greenskeeper.studio";
}

function json(data: unknown, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin, "Vary": "Origin" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    }});
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401, origin);

  const sbAuth = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authErr } = await sbAuth.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401, origin);
  if (user.email?.toLowerCase() !== PLATFORM_OWNER.toLowerCase()) return json({ error: "Forbidden" }, 403, origin);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { action, email } = await req.json();

  if (action === "list") {
    const { data, error } = await sb.from("player_accounts")
      .select("email, plan, billing_status, billing_expires_at, created_at")
      .order("created_at", { ascending: false });
    if (error) return json({ error: error.message }, 500, origin);
    return json({ data }, 200, origin);
  }

  if (action === "comp") {
    if (!email) return json({ error: "email required" }, 400, origin);
    const { error } = await sb.from("player_accounts").upsert(
      { email: email.toLowerCase(), plan: "player", billing_status: "comped", billing_expires_at: null, updated_at: new Date().toISOString() },
      { onConflict: "email" }
    );
    if (error) return json({ error: error.message }, 500, origin);
    return json({ ok: true }, 200, origin);
  }

  if (action === "revoke") {
    if (!email) return json({ error: "email required" }, 400, origin);
    const { error } = await sb.from("player_accounts")
      .update({ billing_status: "inactive", updated_at: new Date().toISOString() })
      .eq("email", email.toLowerCase());
    if (error) return json({ error: error.message }, 500, origin);
    return json({ ok: true }, 200, origin);
  }

  return json({ error: "Unknown action" }, 400, origin);
});

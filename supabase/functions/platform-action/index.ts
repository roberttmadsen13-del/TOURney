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
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
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
    const { data: accounts, error } = await sb.from("player_accounts").select("*");
    if (error) return json({ error: error.message }, 500, origin);

    const { data: authUsers } = await sb.auth.admin.listUsers();
    
    const { data: players } = await sb.from("players").select("id, email");
    const { data: scores } = await sb.from("scores").select("player_id, round");

    const emailByPlayerId = new Map();
    const tourneysMap = new Map();
    if (players) {
      players.forEach((p: any) => {
        const e = p.email?.toLowerCase();
        if (e) {
          emailByPlayerId.set(p.id, e);
          tourneysMap.set(e, (tourneysMap.get(e) || 0) + 1);
        }
      });
    }

    const roundsMap = new Map();
    if (scores) {
      const distinctRounds = new Set();
      scores.forEach((s: any) => {
        distinctRounds.add(`${s.player_id}-${s.round}`);
      });
      distinctRounds.forEach((key: string) => {
        const pid = key.split("-")[0];
        const e = emailByPlayerId.get(pid);
        if (e) roundsMap.set(e, (roundsMap.get(e) || 0) + 1);
      });
    }

    const usersMap = new Map();
    if (authUsers?.users) {
      authUsers.users.forEach((u: any) => {
        usersMap.set(u.email?.toLowerCase(), {
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at
        });
      });
    }

    const enriched = (accounts || []).map((a: any) => {
      const e = a.email?.toLowerCase();
      const u = usersMap.get(e);
      return {
        ...a,
        first_login: u?.created_at || a.created_at,
        last_login: u?.last_sign_in_at || null,
        tourneys_count: tourneysMap.get(e) || 0,
        rounds_count: roundsMap.get(e) || 0
      };
    });

    return json({ data: enriched }, 200, origin);
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

import webpush from 'npm:web-push';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

webpush.setVapidDetails('mailto:rob@greenskeeper.studio', VAPID_PUBLIC, VAPID_PRIVATE);

function allowedOrigin(req: Request): string {
  const o = req.headers.get('Origin') || '';
  return (o.endsWith('.greenskeeper.studio') || o === 'https://greenskeeper.studio') ? o : '';
}

Deno.serve(async (req) => {
  const origin = allowedOrigin(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization,content-type,apikey' } });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Require authenticated caller
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const sbAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await sbAuth.auth.getUser();
  if (authErr || !user) return new Response('Unauthorized', { status: 401 });

  let body: { tournament_id?: string; type?: string; player_name?: string; hole?: string | number; tournament_name?: string; icon_url?: string; slug?: string };
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }

  const { tournament_id, type, player_name, hole, tournament_name, icon_url, slug } = body;
  if (!tournament_id || type !== 'hio') return new Response('Missing params or unknown type', { status: 400 });

  const sbSvc = createClient(SUPABASE_URL, SERVICE_KEY);

  // Verify caller is owner or admin of this tournament
  const { data: tourney } = await sbSvc
    .from('tournaments')
    .select('owner_email')
    .eq('id', tournament_id)
    .single();

  const isOwner = tourney?.owner_email === user.email;
  if (!isOwner) {
    const { data: adminRow } = await sbSvc
      .from('tournament_admins')
      .select('id')
      .eq('tournament_id', tournament_id)
      .eq('email', user.email)
      .maybeSingle();
    if (!adminRow) return new Response('Forbidden', { status: 403 });
  }

  const { data: subs, error } = await sbSvc
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('tournament_id', tournament_id);

  if (error) { console.error('DB error:', error); return new Response('DB error', { status: 500 }); }
  if (!subs || !subs.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const feedUrl = slug
    ? `https://${slug}.greenskeeper.studio/feed?hio=1&player=${encodeURIComponent(player_name || '')}&hole=${encodeURIComponent(String(hole || ''))}`
    : '/feed?hio=1';

  const payload = JSON.stringify({
    title: `⛳ Hole in One — ${player_name || 'Someone'}`,
    body: [hole ? `Hole ${hole}` : null, 'Ace', tournament_name || null].filter(Boolean).join(' · '),
    icon: icon_url || '/icon-192.png',
    badge: '/icon-192.png',
    url: feedUrl,
    type: 'hio',
    player: player_name || '',
    hole: String(hole || ''),
    tag: 'hio',
  });

  const results = await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`HIO push: sent=${sent} failed=${failed} tournament=${tournament_id}`);

  return new Response(JSON.stringify({ sent, failed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
  });
});

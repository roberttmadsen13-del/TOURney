import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('SEND_INSTALL_EMAIL_SECRET')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Verify this came from our Supabase DB webhook (not arbitrary callers)
  const auth = req.headers.get('Authorization');
  if (!auth || auth !== `Bearer ${WEBHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json();
  const player = payload.record;

  if (!player?.email || !player?.tournament_id) {
    return new Response('Missing email or tournament_id', { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: tourney, error } = await supabase
    .from('tournaments')
    .select('slug, name, short_name')
    .eq('id', player.tournament_id)
    .single();

  if (error || !tourney) {
    return new Response('Tournament not found', { status: 404 });
  }

  const { data: logoSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('tournament_id', player.tournament_id)
    .eq('key', 'logo_url')
    .single();

  const appUrl = `https://${tourney.slug}.greenskeeper.studio`;
  const installUrl = `${appUrl}/install`;
  const tourneyName = tourney.name || tourney.short_name || 'Your Tournament';
  const firstName = player.first_name || 'there';
  const logoUrl = logoSetting?.value || null;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin: 0; padding: 0; background: #f5ede0; font-family: 'Georgia', serif; }
  .wrap { max-width: 560px; margin: 0 auto; background: #fff; }
  .header { background: #1a1008; padding: 32px 24px; text-align: center; }
  .header img { max-height: 72px; max-width: 240px; object-fit: contain; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto; }
  .header h1 { color: #c09030; margin: 0; font-size: 22px; letter-spacing: 0.08em; text-transform: uppercase; }
  .body { padding: 32px 24px; }
  .body p { color: #1a1008; font-size: 16px; line-height: 1.6; margin: 0 0 16px; }
  .cta { display: block; background: #c09030; color: #1a1008 !important; text-decoration: none; text-align: center; font-family: sans-serif; font-weight: 700; font-size: 16px; letter-spacing: 0.06em; text-transform: uppercase; padding: 16px 24px; border-radius: 4px; margin: 24px 0; }
  .steps { background: #f5ede0; border-radius: 6px; padding: 20px 24px; margin: 24px 0; }
  .steps p { margin: 0 0 8px; font-family: sans-serif; font-size: 14px; color: #7a5c30; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
  .steps ol { margin: 0; padding-left: 20px; }
  .steps li { font-family: sans-serif; font-size: 14px; color: #1a1008; line-height: 1.8; }
  .footer { padding: 16px 24px; text-align: center; font-family: sans-serif; font-size: 12px; color: #7a5c30; border-top: 1px solid #e8d8b8; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    ${logoUrl ? `<img src="${logoUrl}" alt="${tourneyName}">` : ''}
    <h1>${tourneyName}</h1>
  </div>
  <div class="body">
    <p>Hey ${firstName},</p>
    <p>You're registered. Install the app on your phone so you can track scores, see the leaderboard, and get hole-in-one alerts live on the course.</p>
    <a class="cta" href="${installUrl}">Install the App</a>
    <div class="steps">
      <p>On iPhone — Safari only:</p>
      <ol>
        <li>Tap the link above — opens in Safari</li>
        <li>Tap the <strong>Share</strong> button (box with arrow)</li>
        <li>Tap <strong>"Add to Home Screen"</strong></li>
        <li>Tap <strong>Add</strong></li>
      </ol>
    </div>
    <p>See you on the course.</p>
  </div>
  <div class="footer">
    Powered by <a href="https://tourney.greenskeeper.studio" style="color:#c09030;">TOURney</a> &mdash; Greenskeeper Studios
  </div>
</div>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'no-reply@greenskeeper.studio',
      to: player.email,
      subject: `You're in — install the ${tourneyName} app`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    return new Response('Email failed', { status: 500 });
  }

  return new Response('OK', { status: 200 });
});

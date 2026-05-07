import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

const PRICE_IDS: Record<string, string> = {
  starter: Deno.env.get('STRIPE_PRICE_STARTER')!,
  pro:     Deno.env.get('STRIPE_PRICE_PRO')!,
  club:    Deno.env.get('STRIPE_PRICE_CLUB')!,
};

const BASE_URL = Deno.env.get('TOURNEY_BASE_URL') ?? 'https://tourney.greenskeeper.studio';

function allowedOrigin(req: Request): string {
  const o = req.headers.get('Origin') || '';
  return (o.endsWith('.greenskeeper.studio') || o === 'https://greenskeeper.studio') ? o : '';
}

Deno.serve(async (req) => {
  const origin = allowedOrigin(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401, origin);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401, origin);

    const { tournament_id, tournament_slug, tier } = await req.json();

    if (!tournament_id || !tournament_slug || !tier || !(tier in PRICE_IDS)) {
      return json({ error: 'Missing or invalid fields' }, 400, origin);
    }

    // Use verified JWT email — never trust body-supplied email
    const { data: tourney, error: tErr } = await supabase
      .from('tournaments')
      .select('id, status')
      .eq('id', tournament_id)
      .eq('owner_email', user.email)
      .single();

    if (tErr || !tourney) return json({ error: 'Tournament not found or access denied' }, 403, origin);
    if (tourney.status !== 'pending_payment') return json({ error: 'Tournament already active' }, 409, origin);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email!,
      line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
      success_url: `${BASE_URL}/t/${tournament_slug}/admin?activated=1`,
      cancel_url:  `${BASE_URL}/create?cancelled=1&tid=${tournament_id}`,
      metadata: { tournament_id, tier },
      subscription_data: { metadata: { tournament_id, tier } },
    });

    return json({ url: session.url }, 200, origin);

  } catch (e) {
    console.error('create-checkout error:', e);
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500, origin);
  }
});

function json(body: unknown, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
    },
  });
}

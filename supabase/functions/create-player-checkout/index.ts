import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const PRICE_ID  = Deno.env.get('STRIPE_PRICE_PLAYER') ?? '';
const BASE_URL  = Deno.env.get('TOURNEY_BASE_URL') ?? 'https://tourney.greenskeeper.studio';

function cors(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'content-type',
  };
}

function allowedOrigin(req: Request): string {
  const o = req.headers.get('Origin') || '';
  return (o.endsWith('.greenskeeper.studio') || o === 'https://greenskeeper.studio') ? o : '';
}

function json(body: unknown, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

Deno.serve(async (req) => {
  const origin = allowedOrigin(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors(origin) });
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);

  if (!PRICE_ID) return json({ error: 'Stripe not configured' }, 503, origin);

  let email: string;
  try {
    const body = await req.json();
    email = (body.email ?? '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error();
  } catch {
    return json({ error: 'Valid email required' }, 400, origin);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      metadata: { email, plan: 'pro' },
      subscription_data: { metadata: { email, plan: 'pro' } },
      success_url: `${BASE_URL}/player-upgrade?success=1&email=${encodeURIComponent(email)}`,
      cancel_url:  `${BASE_URL}/player-upgrade?email=${encodeURIComponent(email)}`,
    });
    return json({ url: session.url }, 200, origin);
  } catch (e) {
    console.error('create-player-checkout error:', e);
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500, origin);
  }
});

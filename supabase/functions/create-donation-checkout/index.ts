import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const BASE_URL = Deno.env.get('TOURNEY_BASE_URL') ?? 'https://tourney.greenskeeper.studio';

function allowedOrigin(req: Request): string {
  const o = req.headers.get('Origin') || '';
  return (o.endsWith('.greenskeeper.studio') || o === 'https://greenskeeper.studio') ? o : '';
}

function json(body: unknown, status = 200, origin = ''): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    },
  });
}

Deno.serve(async (req) => {
  const origin = allowedOrigin(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401, origin);

    // Verify JWT — extract user from token (Supabase JWT decode)
    const token = authHeader.replace('Bearer ', '');
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    const userId: string = payload.sub;
    if (!userId) return json({ error: 'Invalid token' }, 401, origin);

    const { amount_cents, message } = await req.json() as { amount_cents: number; message?: string };

    if (!amount_cents || amount_cents < 100) {
      return json({ error: 'Minimum donation is $1' }, 400, origin);
    }
    if (amount_cents > 99900) {
      return json({ error: 'Maximum donation is $999' }, 400, origin);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amount_cents,
          product_data: {
            name: 'TOURney Donation',
            description: message || 'Supporting the platform',
          },
        },
        quantity: 1,
      }],
      metadata: {
        donation: 'true',
        mygolf_profile_id: userId,
        message: message || '',
      },
      success_url: `${BASE_URL}/player?donation=success`,
      cancel_url:  `${BASE_URL}/player?donation=cancelled`,
    });

    return json({ url: session.url }, 200, origin);
  } catch (err) {
    console.error('create-donation-checkout error:', err);
    return json({ error: 'Internal server error' }, 500, origin);
  }
});

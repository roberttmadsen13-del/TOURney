import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

// Service role — bypasses RLS for webhook updates
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Stripe price ID → internal plan name.
// Populated from env vars — set STRIPE_PRICE_PLAYER in Supabase dashboard once product is created.
const PRICE_TO_PLAN: Record<string, string> = Object.fromEntries(
  [
    [Deno.env.get('STRIPE_PRICE_PLAYER'), 'pro'],
  ].filter(([id]) => !!id) as [string, string][]
);

async function setPlan(email: string, plan: string, billingRef: string, billingStatus: string, expiresAt: string | null) {
  const { error } = await supabase.from('player_accounts').upsert(
    { email, plan, billing_status: billingStatus, billing_ref: billingRef, billing_expires_at: expiresAt, updated_at: new Date().toISOString() },
    { onConflict: 'email' }
  );
  if (error) throw new Error(`player_accounts upsert failed: ${error.message}`);
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (e) {
    console.error('Webhook signature verification failed:', e);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.metadata?.email ?? session.customer_email ?? session.customer_details?.email;
        const plan = session.metadata?.plan ?? 'pro';
        if (!email) { console.warn('checkout.session.completed: no email in metadata or session'); break; }
        const expiresAt = session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null;
        await setPlan(email, plan, session.subscription as string ?? session.id, 'active', expiresAt);
        console.log(`checkout complete: ${email} → ${plan}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const email = sub.metadata?.email;
        if (!email) { console.warn('subscription.updated: no email in metadata'); break; }
        const priceId = sub.items.data[0]?.price?.id ?? '';
        const plan = PRICE_TO_PLAN[priceId] ?? sub.metadata?.plan ?? 'pro';
        const expiresAt = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
        const billingStatus = sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'inactive';
        await setPlan(email, sub.status === 'canceled' ? 'free' : plan, sub.id, billingStatus, expiresAt);
        console.log(`subscription updated: ${email} → ${plan} (${sub.status})`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const email = sub.metadata?.email;
        if (!email) { console.warn('subscription.deleted: no email in metadata'); break; }
        await setPlan(email, 'free', sub.id, 'inactive', null);
        console.log(`subscription canceled: ${email} → free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email;
        if (!email || !invoice.subscription) break;
        await supabase.from('player_accounts')
          .update({ billing_status: 'past_due', updated_at: new Date().toISOString() })
          .eq('email', email);
        console.log(`payment failed: ${email} → past_due`);
        break;
      }
    }
  } catch (e) {
    console.error(`Handler error for ${event.type}:`, e);
    // Return 200 — Stripe retries on non-2xx causing duplicate events
  }

  return new Response('ok', { status: 200 });
});

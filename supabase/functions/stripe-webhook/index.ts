import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

// Service role — bypasses RLS for webhook updates
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

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
        const { tournament_id, tier } = session.metadata ?? {};
        if (!tournament_id || !tier) break;

        await supabase.from('tournaments').update({
          status:                'active',
          tier,
          stripe_customer_id:    session.customer as string,
          stripe_subscription_id: session.subscription as string,
          stripe_status:         'active',
          carry_forward_enabled: tier === 'club',
        }).eq('id', tournament_id);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const { tournament_id, tier } = sub.metadata ?? {};
        if (!tournament_id) break;

        const newTier = tier ?? 'starter';
        await supabase.from('tournaments').update({
          stripe_status:         sub.status,
          tier:                  newTier,
          carry_forward_enabled: newTier === 'club',
          // Reactivate if subscription comes back from past_due
          ...(sub.status === 'active' ? { status: 'active' } : {}),
        }).eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase.from('tournaments').update({
          stripe_status:         'canceled',
          status:                'suspended',
          carry_forward_enabled: false,
        }).eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;
        await supabase.from('tournaments').update({
          stripe_status: 'past_due',
        }).eq('stripe_subscription_id', invoice.subscription as string);
        break;
      }
    }
  } catch (e) {
    console.error(`Handler error for ${event.type}:`, e);
    // Still return 200 — Stripe retries on non-2xx, causing duplicate events
  }

  return new Response('ok', { status: 200 });
});

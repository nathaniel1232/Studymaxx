/**
 * Bulk sync all active Stripe subscribers to Supabase.
 * Finds every active subscription in Stripe and ensures is_premium = true in DB.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover',
});

async function syncAllPremium() {
  console.log('🔄 Syncing all active Stripe subscribers to Supabase...\n');

  let fixed = 0;
  let alreadyOk = 0;
  let notFound = 0;
  let errors = 0;

  // Page through ALL active subscriptions in Stripe
  let hasMore = true;
  let startingAfter = undefined;

  while (hasMore) {
    const params = { status: 'active', limit: 100, expand: ['data.customer'] };
    if (startingAfter) params.starting_after = startingAfter;

    const subscriptions = await stripe.subscriptions.list(params);

    for (const sub of subscriptions.data) {
      const customer = sub.customer;
      const email = (typeof customer === 'object' ? customer.email : null) || '';
      const customerId = typeof customer === 'object' ? customer.id : customer;
      const subscriptionId = sub.id;
      // current_period_end can be null for some trial/incomplete subs — default to 30 days
      const periodEnd = sub.current_period_end;
      const expiresAt = periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (!email) {
        console.log(`⚠️  Subscription ${subscriptionId} has no email, skipping`);
        continue;
      }

      try {
        // Look up user by email in Supabase
        const { data: users, error } = await supabase
          .from('users')
          .select('id, email, is_premium')
          .ilike('email', email)
          .limit(1);

        if (error || !users || users.length === 0) {
          console.log(`❌ Not found in DB: ${email}`);
          notFound++;
          continue;
        }

        const user = users[0];

        if (user.is_premium) {
          alreadyOk++;
          process.stdout.write('.');
          continue;
        }

        // User has active Stripe sub but is NOT premium in DB — fix it
        const { error: updateError } = await supabase
          .from('users')
          .update({
            is_premium: true,
            subscription_tier: 'premium',
            premium_expires_at: expiresAt,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('id', user.id);

        if (updateError) {
          console.log(`\n❌ Failed to update ${email}: ${updateError.message}`);
          errors++;
        } else {
          console.log(`\n✅ Fixed: ${email} (sub: ${subscriptionId}, expires: ${expiresAt})`);
          fixed++;
        }
      } catch (err) {
        console.log(`\n❌ Error processing ${email}: ${err.message}`);
        errors++;
      }
    }

    hasMore = subscriptions.has_more;
    if (hasMore && subscriptions.data.length > 0) {
      startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
    }
  }

  // Also catch any users whose premium_expires_at is in the future but is_premium = false
  console.log('\n\n🔍 Checking for users with future expiry but is_premium = false...');
  const { data: expiredUsers, error: expiredError } = await supabase
    .from('users')
    .select('id, email, premium_expires_at, stripe_subscription_id')
    .eq('is_premium', false)
    .not('premium_expires_at', 'is', null)
    .gt('premium_expires_at', new Date().toISOString());

  if (!expiredError && expiredUsers && expiredUsers.length > 0) {
    for (const u of expiredUsers) {
      const { error: fixError } = await supabase
        .from('users')
        .update({ is_premium: true, subscription_tier: 'premium' })
        .eq('id', u.id);
      if (!fixError) {
        console.log(`✅ Fixed via expiry date: ${u.email} (expires: ${u.premium_expires_at})`);
        fixed++;
      }
    }
  } else {
    console.log('   None found.');
  }

  console.log('\n========== SUMMARY ==========');
  console.log(`✅ Fixed (were broken):  ${fixed}`);
  console.log(`✔️  Already correct:      ${alreadyOk}`);
  console.log(`❓ Not in DB:            ${notFound}`);
  console.log(`❌ Errors:               ${errors}`);
  console.log('==============================\n');
}

syncAllPremium().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

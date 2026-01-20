const fs = require('fs');
const Stripe = require('stripe');

// Load .env.local
const env = {};
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

(async () => {
  try {
    let hasMore = true;
    let startingAfter = undefined;
    let totalMRR = 0;
    let activeCount = 0;

    while (hasMore) {
      const res = await stripe.subscriptions.list({ limit: 100, starting_after: startingAfter });
      for (const sub of res.data) {
        if (['active', 'trialing', 'past_due'].includes(sub.status)) {
          let subMRR = 0;
          for (const item of sub.items.data) {
            const price = item.price || {};
            const unit = price.unit_amount !== null && price.unit_amount !== undefined
              ? price.unit_amount
              : price.unit_amount_decimal !== null && price.unit_amount_decimal !== undefined
                ? parseFloat(price.unit_amount_decimal)
                : 0;
            const quantity = item.quantity || 1;
            const interval = price.recurring ? price.recurring.interval : 'month';
            let amount = (unit / 100) * quantity;
            if (interval === 'month') {
              subMRR += amount;
            } else if (interval === 'year') {
              subMRR += amount / 12;
            }
          }
          totalMRR += subMRR;
          activeCount += 1;
        }
      }
      hasMore = res.has_more;
      if (hasMore) startingAfter = res.data[res.data.length - 1].id;
    }

    console.log('Active subscriptions considered:', activeCount);
    console.log('Estimated MRR (USD):', totalMRR.toFixed(2));
  } catch (err) {
    console.error('Error calculating MRR:', err.message);
  }
})();

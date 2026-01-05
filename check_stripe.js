const fs = require('fs');
const Stripe = require('stripe');

// Load .env.local manually
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
    const customers = await stripe.customers.list({ limit: 100 });
    console.log('=== STRIPE CUSTOMERS & SUBSCRIPTIONS ===\n');
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({ customer: customer.id });
      const status = subscriptions.data.length > 0 ? 'HAS SUBSCRIPTION' : 'NO SUBSCRIPTION';
      console.log(status + ' | ' + (customer.email || 'No email'));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();

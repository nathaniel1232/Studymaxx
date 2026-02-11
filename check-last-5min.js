require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkLastMinuteCheckouts() {
  console.log('\n🔍 Checking checkouts from last 5 minutes...\n');
  
  try {
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
    
    const sessions = await stripe.checkout.sessions.list({
      limit: 20,
      created: { gte: fiveMinutesAgo }
    });
    
    console.log(`Found ${sessions.data.length} sessions in last 5 minutes:\n`);
    
    for (const session of sessions.data) {
      console.log('═══════════════════════════════════════');
      console.log('Email:', session.customer_email);
      console.log('Status:', session.status);
      console.log('Payment status:', session.payment_status);
      console.log('Created:', new Date(session.created * 1000).toISOString());
      console.log('User ID:', session.metadata?.userId || session.client_reference_id);
      console.log('Subscription:', session.subscription);
      console.log('═══════════════════════════════════════\n');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkLastMinuteCheckouts();

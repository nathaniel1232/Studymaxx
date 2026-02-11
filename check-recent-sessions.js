require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkRecentSessions() {
  console.log('\n🔍 Checking recent checkout sessions...\n');
  
  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 10
    });
    
    for (const session of sessions.data) {
      console.log('═══════════════════════════════════════');
      console.log('Session ID:', session.id);
      console.log('Email:', session.customer_email);
      console.log('Customer ID:', session.customer);
      console.log('Status:', session.status);
      console.log('Payment status:', session.payment_status);
      console.log('Created:', new Date(session.created * 1000).toISOString());
      console.log('\n🔑 USER ID TRACKING:');
      console.log('  metadata.userId:', session.metadata?.userId || '❌ MISSING');
      console.log('  client_reference_id:', session.client_reference_id || '❌ MISSING');
      console.log('  Subscription ID:', session.subscription || 'None');
      console.log('═══════════════════════════════════════\n');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkRecentSessions();

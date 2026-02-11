require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkWebhookEvents() {
  console.log('\n🔍 Checking webhook events...\n');
  
  try {
    // Get recent webhook events
    const events = await stripe.events.list({
      limit: 20,
      types: ['checkout.session.completed']
    });
    
    console.log(`Found ${events.data.length} checkout.session.completed events:\n`);
    
    for (const event of events.data) {
      const session = event.data.object;
      console.log('═══════════════════════════════════════');
      console.log('Event ID:', event.id);
      console.log('Created:', new Date(event.created * 1000).toISOString());
      console.log('Session ID:', session.id);
      console.log('Email:', session.customer_email);
      console.log('userId:', session.metadata?.userId || session.client_reference_id);
      console.log('Webhook attempts:');
      
      // Try to get webhook endpoints
      try {
        const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
        console.log(`  Found ${webhookEndpoints.data.length} webhook endpoints`);
        for (const endpoint of webhookEndpoints.data) {
          console.log(`  - ${endpoint.url} (${endpoint.status})`);
          console.log(`    Events: ${endpoint.enabled_events.join(', ')}`);
        }
      } catch (e) {
        console.log('  Could not fetch webhook endpoints');
      }
      
      console.log('═══════════════════════════════════════\n');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkWebhookEvents();

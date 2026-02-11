require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkWebhookAttempts() {
  console.log('\n🔍 Checking webhook delivery attempts for recent events...\n');
  
  try {
    // Get the specific event for ntlmotivation@gmail.com
    const eventId = 'evt_1SzeLOPDFQXMY7ipTrpvubpp';
    
    console.log(`Checking event: ${eventId}\n`);
    
    const event = await stripe.events.retrieve(eventId);
    
    console.log('Event Details:');
    console.log('  Type:', event.type);
    console.log('  Created:', new Date(event.created * 1000).toISOString());
    console.log('  Customer:', event.data.object.customer_email);
    console.log('  User ID:', event.data.object.metadata?.userId);
    console.log('');
    
    // Get webhook endpoints
    const endpoints = await stripe.webhookEndpoints.list();
    
    console.log('Webhook Endpoints:');
    for (const endpoint of endpoints.data) {
      console.log(`\n  ${endpoint.url}`);
      console.log(`    Status: ${endpoint.status}`);
      console.log(`    Events: ${endpoint.enabled_events.join(', ')}`);
      
      // Check if this endpoint is listening to the event type
      if (endpoint.enabled_events.includes(event.type) || endpoint.enabled_events.includes('*')) {
        console.log('    ✅ This endpoint should receive the event');
      } else {
        console.log('    ⚠️  This endpoint will NOT receive the event');
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  NOTE: Stripe does not provide detailed webhook delivery logs via API');
    console.log('Check Stripe Dashboard → Developers → Webhooks → Click endpoint → View logs');
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkWebhookAttempts();

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkWebhookForSession() {
  const sessionId = 'cs_live_b1J21BGztmHxluMz5i3dPkzE2yQ2ff8spnv5mCY1F68UcvnOifm9fhVE4V';
  
  console.log('\n🔍 Checking webhook events for session:', sessionId, '\n');
  
  try {
    // Get all events for this session
    const events = await stripe.events.list({
      limit: 50,
      types: ['checkout.session.completed']
    });
    
    // Find the event for this session
    const relevantEvent = events.data.find(e => e.data.object.id === sessionId);
    
    if (relevantEvent) {
      console.log('✅ Found event:', relevantEvent.id);
      console.log('Created:', new Date(relevantEvent.created * 1000).toISOString());
      console.log('');
      
      // Check webhook delivery
      console.log('Checking webhook endpoint...');
      const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });
      
      for (const endpoint of endpoints.data) {
        console.log('\nWebhook Endpoint:', endpoint.url);
        console.log('  Status:', endpoint.status);
        console.log('  Enabled events:', endpoint.enabled_events.join(', '));
        
        if (endpoint.enabled_events.includes('checkout.session.completed')) {
          console.log('  ✅ Should receive checkout.session.completed');
        }
      }
      
      console.log('\n⚠️  To check delivery status:');
      console.log('1. Go to: https://dashboard.stripe.com/webhooks');
      console.log('2. Click on your webhook endpoint');
      console.log('3. Look for event:', relevantEvent.id);
      console.log('4. Check if it shows "Succeeded" or "Failed"');
      
    } else {
      console.log('❌ No checkout.session.completed event found for this session');
      console.log('This might mean:');
      console.log('  1. Event not created yet (wait a few seconds)');
      console.log('  2. Session not actually completed');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkWebhookForSession();

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkSubscriptionDetails() {
  const subscriptionId = 'sub_1SzeLLPDFQXMY7ipvACZX9vy';
  
  console.log('\n🔍 Checking subscription details...\n');
  
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data']
    });
    
    console.log('Subscription Details:');
    console.log('  ID:', subscription.id);
    console.log('  Status:', subscription.status);
    console.log('  Customer:', subscription.customer);
    console.log('');
    console.log('⏰ Period Information:');
    console.log('  current_period_start:', subscription.current_period_start);
    console.log('  current_period_end:', subscription.current_period_end);
    console.log('');
    
    if (subscription.current_period_start) {
      console.log('  Start Date:', new Date(subscription.current_period_start * 1000).toISOString());
    }
    if (subscription.current_period_end) {
      console.log('  End Date:', new Date(subscription.current_period_end * 1000).toISOString());
    }
    console.log('');
    
    console.log('📦 Items:');
    if (subscription.items && subscription.items.data) {
      for (const item of subscription.items.data) {
        console.log('  Item ID:', item.id);
        console.log('  Price ID:', item.price.id);
        console.log('  Product:', item.price.product);
        console.log('  Interval:', item.price.recurring?.interval);
        console.log('  Amount:', item.price.unit_amount / 100, item.price.currency.toUpperCase());
        console.log('');
      }
    }
    
    console.log('Full Subscription Object:');
    console.log(JSON.stringify(subscription, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSubscriptionDetails();

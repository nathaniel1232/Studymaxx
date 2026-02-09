/**
 * TEST WEBHOOK LOCALLY
 * 
 * This simulates a Stripe webhook event locally to test your webhook handler.
 * Use this to debug webhook issues without making real payments.
 */

require('dotenv').config({ path: '.env.local' });

async function testWebhook() {
  console.log('🧪 Testing Stripe Webhook Handler Locally\n');

  const testEmail = 'nathanielfisk54@gmail.com';
  const testUserId = 'TEST_USER_ID_HERE'; // Replace with actual user ID from Supabase

  console.log(`Testing with:`);
  console.log(`  Email: ${testEmail}`);
  console.log(`  User ID: ${testUserId}\n`);

  const testEvent = {
    id: 'evt_test_webhook_' + Date.now(),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_' + Date.now(),
        customer: 'cus_test_' + Date.now(),
        customer_email: testEmail,
        subscription: 'sub_test_' + Date.now(),
        metadata: {
          userId: testUserId
        },
        client_reference_id: testUserId
      }
    }
  };

  console.log('📤 Sending test event to webhook...\n');
  console.log(JSON.stringify(testEvent, null, 2));

  try {
    const response = await fetch('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature_for_local_testing'
      },
      body: JSON.stringify(testEvent)
    });

    const result = await response.json();
    
    console.log('\n📥 Response:', response.status);
    console.log('Response Data:', result);

    if (response.ok) {
      console.log('\n✅ Webhook test passed!');
      console.log('\nNow check Supabase to see if the user was updated with:');
      console.log('  - is_premium = true');
      console.log('  - stripe_customer_id = cus_test_XXX');
      console.log('  - stripe_subscription_id = sub_test_XXX');
    } else {
      console.log('\n❌ Webhook test failed!');
      console.log('Check the error message above for details.');
    }

  } catch (error) {
    console.error('\n❌ Failed to call webhook:', error);
    console.log('\nMake sure:');
    console.log('1. Your dev server is running (npm run dev)');
    console.log('2. Webhook endpoint is at /api/stripe/webhook');
  }
}

console.log('⚠️  NOTE: This test will fail signature verification.');
console.log('You need to temporarily disable signature check for local testing.\n');
console.log('Or use Stripe CLI to forward real webhook events:\n');
console.log('  stripe listen --forward-to localhost:3000/api/stripe/webhook\n');

console.log('Starting test in 3 seconds...\n');
setTimeout(testWebhook, 3000);

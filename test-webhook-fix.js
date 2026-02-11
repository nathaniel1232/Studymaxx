require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * TEST: Verify webhook code will correctly extract period_end
 * This simulates what the webhook does without actually running it
 */
async function testWebhookLogic() {
  console.log('\n🧪 TESTING WEBHOOK LOGIC (NO REAL CHANGES)\n');
  console.log('═'.repeat(60));
  
  try {
    // Get ntlmotivation@gmail.com's subscription
    const subscriptionId = 'sub_1SzeLLPDFQXMY7ipvACZX9vy';
    
    console.log('📡 Fetching subscription:', subscriptionId);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subData = subscription;
    
    // SIMULATE THE NEW WEBHOOK CODE
    console.log('\n🔍 Simulating webhook code...\n');
    
    let periodEnd = null;
    let premiumExpiresAt = null;
    
    console.log('Step 1: Check items.data[0].current_period_end');
    if (subData.items?.data?.[0]?.current_period_end) {
      periodEnd = subData.items.data[0].current_period_end;
      console.log('  ✅ Found:', periodEnd);
    } else {
      console.log('  ❌ Not found');
    }
    
    console.log('\nStep 2: Fallback to current_period_end');
    if (!periodEnd && subData.current_period_end) {
      periodEnd = subData.current_period_end;
      console.log('  ✅ Found:', periodEnd);
    } else if (!periodEnd) {
      console.log('  ❌ Not found');
    } else {
      console.log('  ⏭️  Skipped (already found)');
    }
    
    console.log('\nStep 3: Convert to ISO date');
    if (periodEnd) {
      premiumExpiresAt = new Date(periodEnd * 1000).toISOString();
      console.log('  ✅ Converted:', premiumExpiresAt);
    } else {
      console.log('  ❌ Cannot convert (no period end)');
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('RESULT:');
    console.log('═'.repeat(60));
    
    if (premiumExpiresAt) {
      console.log('✅✅✅ SUCCESS!');
      console.log('');
      console.log('The webhook would set:');
      console.log('  premium_expires_at:', premiumExpiresAt);
      console.log('  is_premium: true');
      console.log('');
      console.log('🎉 NEW WEBHOOK CODE WORKS CORRECTLY!');
    } else {
      console.log('❌❌❌ FAILURE!');
      console.log('');
      console.log('The webhook would set:');
      console.log('  premium_expires_at: null');
      console.log('  is_premium: true');
      console.log('');
      console.log('⚠️  PROBLEM STILL EXISTS - USERS WOULD GET PREMIUM BUT NO EXPIRY');
    }
    
    console.log('\n' + '═'.repeat(60));
    
    // Also test the OLD broken code
    console.log('\n📊 COMPARISON WITH OLD CODE:\n');
    
    const oldPeriodEnd = subData.current_period_end;
    console.log('Old code would read: subscription.current_period_end =', oldPeriodEnd || 'undefined');
    console.log('New code reads: subscription.items.data[0].current_period_end =', periodEnd);
    console.log('');
    
    if (oldPeriodEnd === undefined && periodEnd) {
      console.log('✅ FIX CONFIRMED: New code finds period_end, old code does not!');
    } else if (oldPeriodEnd && periodEnd) {
      console.log('ℹ️  Both work, but new code has better fallback logic');
    } else {
      console.log('⚠️  Something unexpected happened');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWebhookLogic();

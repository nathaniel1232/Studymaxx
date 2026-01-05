const fs = require('fs');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  try {
    console.log('Syncing Stripe subscriptions with database...\n');
    
    // Get all Stripe customers with active subscriptions
    const customers = await stripe.customers.list({ limit: 100 });
    let activated = 0;
    
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({ 
        customer: customer.id,
        status: 'active'
      });
      
      if (subscriptions.data.length > 0 && customer.email) {
        // Check if they're premium in database
        const { data: user } = await supabase
          .from('users')
          .select('email, is_premium')
          .eq('email', customer.email)
          .single();
        
        if (user && !user.is_premium) {
          // Activate them
          await supabase
            .from('users')
            .update({ is_premium: true })
            .eq('email', customer.email);
          
          console.log(`✅ ACTIVATED: ${customer.email}`);
          activated++;
        } else if (user && user.is_premium) {
          console.log(`✓ Already premium: ${customer.email}`);
        }
      }
    }
    
    console.log(`\n✅ Done! Activated ${activated} user(s)`);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();

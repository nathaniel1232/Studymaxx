-- ====================================================================
-- CREATE TRIGGER: Auto-fill premium fields for new users
-- ====================================================================

CREATE OR REPLACE FUNCTION set_premium_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Hvis is_premium = true, sett subscription_tier = 'premium'
  IF NEW.is_premium = true THEN
    IF NEW.subscription_tier IS NULL OR NEW.subscription_tier = 'free' THEN
      NEW.subscription_tier := 'premium';
    END IF;
    
    -- Hvis premium_expires_at ikke er satt, sett det til 1 måned fra nå
    IF NEW.premium_expires_at IS NULL THEN
      NEW.premium_expires_at := NOW() + INTERVAL '1 month';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (to avoid conflicts)
DROP TRIGGER IF EXISTS set_premium_defaults_trigger ON public.users;

-- Create trigger
CREATE TRIGGER set_premium_defaults_trigger
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION set_premium_defaults();

-- ====================================================================
-- Verifiser at trigger ble opprettet
-- ====================================================================

SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'set_premium_defaults_trigger';

-- ====================================================================
-- TEST: Lag en test bruker for å sjekke at trigger virker
-- ====================================================================

-- Kommentert ut - bare kjør hvis du vil teste:
-- INSERT INTO public.users (id, email, is_premium)
-- VALUES (gen_random_uuid(), 'test-trigger@example.com', true)
-- RETURNING email, is_premium, subscription_tier, premium_expires_at;

-- ====================================================================
-- RESULTAT FORVENTET:
-- ====================================================================
-- Trigger skal vise: set_premium_defaults_trigger | INSERT | users
-- Dette betyr at nye brukere med is_premium=true automatisk får:
--  - subscription_tier = 'premium'
--  - premium_expires_at = nå + 1 måned
-- ====================================================================

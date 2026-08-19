-- ==============================================================================
-- MIGRATION: 20260819025500_polish_and_triggers.sql
-- Optimizations for ALVSHOP:
-- 1. Add email and avatar to profiles table for easy search.
-- 2. Add image_url to categories & subcategories.
-- 3. Add coupon reference, discount amount, whatsapp phone to orders.
-- 4. Add cost_usdt to order_items for exact historical net profit calculation.
-- 5. Auto-create profile trigger on auth.users registration.
-- ==============================================================================

-- 1. Profiles optimizations
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Category & Subcategory visual elements
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT;

ALTER TABLE subcategories 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. Orders discount and customer details
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_amount_usdt NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- 4. Order Items cost snapshot (for exact gross/net profit analytics)
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS cost_usdt NUMERIC(12, 2) DEFAULT 0.00;

-- 5. Automatic Profile Trigger on Auth Sign-Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code TEXT;
BEGIN
  -- Generate a random referral code like ALV-XXXX
  new_referral_code := 'ALV-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

  INSERT INTO public.profiles (id, full_name, email, role, referral_code, wallet_balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'Cliente Común',
    new_referral_code,
    0.00
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed initial categories and sample products for testing if empty
INSERT INTO categories (name, slug) 
VALUES 
  ('Gaming & Recargas', 'gaming'),
  ('Streaming & Entretenimiento', 'streaming'),
  ('Tarjetas de Regalo', 'gift-cards')
ON CONFLICT (slug) DO NOTHING;

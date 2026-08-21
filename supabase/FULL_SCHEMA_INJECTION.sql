-- ==============================================================================
-- ALVSHOP2 - FULL CONSOLIDATED DATABASE SCHEMA & MIGRATION SCRIPT
-- Project: enqjpyktgbwvkpfwvgfu
-- ==============================================================================

-- 1. ENUMS (Safe creation)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('Admin', 'Asesor', 'Revendedor', 'Cliente Especial', 'Cliente Oferta', 'Cliente Común');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('Pending', 'Verification', 'Completed', 'Rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('Manual', 'Wallet');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'Cliente Común',
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  country TEXT,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES profiles(id),
  wallet_balance NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CONFIG TABLE (Dynamic Branding, Colors, Bank Accounts, Socials, SEO)
CREATE TABLE IF NOT EXISTS config (
  id INT PRIMARY KEY DEFAULT 1,
  usdt_gtq_rate NUMERIC(10, 4) NOT NULL DEFAULT 7.8000,
  background_color TEXT DEFAULT '#0a0d14',
  primary_color TEXT DEFAULT '#1e3a8a',
  accent_color TEXT DEFAULT '#06b6d4',
  secondary_color TEXT DEFAULT '#0284c7',
  logo_url TEXT,
  favicon_url TEXT,
  banners JSONB DEFAULT '[]'::jsonb,
  site_title TEXT DEFAULT 'ALVSHOP - Recargas & Cuentas Digitales',
  site_description TEXT DEFAULT 'Plataforma líder en recargas de juegos y cuentas digitales.',
  custom_head_scripts TEXT,
  discount_offer_pct NUMERIC(5,2) DEFAULT 5.00,
  discount_special_pct NUMERIC(5,2) DEFAULT 10.00,
  bank_accounts JSONB DEFAULT '[{"bank": "Banrural", "account_number": "4313076359", "type": "Ahorro", "name": "Jonathan Alvares"}]'::jsonb,
  social_links JSONB DEFAULT '{"whatsapp": "50250000000"}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO config (id, usdt_gtq_rate, background_color, primary_color, accent_color, secondary_color)
VALUES (1, 7.8000, '#0a0d14', '#1e3a8a', '#06b6d4', '#0284c7')
ON CONFLICT (id) DO UPDATE
SET 
  background_color = EXCLUDED.background_color,
  primary_color = EXCLUDED.primary_color,
  accent_color = EXCLUDED.accent_color;

-- 4. CATEGORIES & SUBCATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT '💎',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_public NUMERIC(12, 2) NOT NULL,
  price_reseller NUMERIC(12, 2) NOT NULL,
  cost NUMERIC(12, 2) NOT NULL,
  stock INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  button_action_text TEXT DEFAULT 'Comprar',
  requires_validation BOOLEAN DEFAULT false,
  validation_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PRODUCT FIELDS (FORM BUILDER)
CREATE TABLE IF NOT EXISTS product_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT DEFAULT 'text',
  is_required BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- 7. COUPONS & PROMOS
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(10,2) NOT NULL,
  min_purchase_usdt NUMERIC(10,2) DEFAULT 0.00,
  max_uses INT,
  used_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ORDERS & ORDER ITEMS
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  total_usdt NUMERIC(12, 2) NOT NULL,
  total_gtq NUMERIC(12, 2) NOT NULL,
  status order_status DEFAULT 'Pending',
  payment_method payment_method DEFAULT 'Manual',
  bank_receipt_url TEXT,
  rejection_reason TEXT,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  discount_amount_usdt NUMERIC(12, 2) DEFAULT 0.00,
  whatsapp_phone TEXT,
  customer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  price_usdt NUMERIC(12, 2) NOT NULL,
  cost_usdt NUMERIC(12, 2) DEFAULT 0.00,
  fields_data JSONB DEFAULT '{}'::jsonb,
  credentials_delivered TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. DIGITAL CREDENTIALS INVENTORY (STREAMING)
CREATE TABLE IF NOT EXISTS credentials_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  account_email TEXT,
  account_password TEXT,
  pin TEXT,
  profile_name TEXT,
  extra_info TEXT,
  is_sold BOOLEAN DEFAULT false,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sold_at TIMESTAMPTZ
);

-- 10. REVIEWS & TRANSACTIONS
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount_usdt NUMERIC(12, 2) NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. COMMUNITY FEED (POSTS, COMMENTS, LIKES)
CREATE TABLE IF NOT EXISTS feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT DEFAULT 'image',
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 12. SUPPORT CHAT (CONVERSATIONS & MESSAGES)
CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'open',
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_admin_reply BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. NO-CODE API CONNECTOR (SUPPLIER INTEGRATIONS)
CREATE TABLE IF NOT EXISTS supplier_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  http_method TEXT DEFAULT 'POST',
  headers JSONB DEFAULT '{"Content-Type": "application/json"}'::jsonb,
  body_template JSONB DEFAULT '{"uid": "{{uid}}", "order_id": "{{order_id}}"}'::jsonb,
  response_mapping JSONB DEFAULT '{"transaction_id": "data.trx_id", "status": "status"}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. PUSH NOTIFICATIONS & LOGS
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. AUTOMATIC PROFILE CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code TEXT;
BEGIN
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 16. ENABLE RLS FOR ALL TABLES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- 17. RE-APPLY COMPREHENSIVE RLS POLICIES
DO $$ BEGIN
  -- Public Selects
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Config is viewable by everyone" ON config;
  CREATE POLICY "Config is viewable by everyone" ON config FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
  CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Subcategories are viewable by everyone" ON subcategories;
  CREATE POLICY "Subcategories are viewable by everyone" ON subcategories FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
  CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Product fields are viewable by everyone" ON product_fields;
  CREATE POLICY "Product fields are viewable by everyone" ON product_fields FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Coupons are viewable by everyone" ON coupons;
  CREATE POLICY "Coupons are viewable by everyone" ON coupons FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Feed posts are viewable by everyone" ON feed_posts;
  CREATE POLICY "Feed posts are viewable by everyone" ON feed_posts FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Feed comments are viewable by everyone" ON feed_comments;
  CREATE POLICY "Feed comments are viewable by everyone" ON feed_comments FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Feed likes are viewable by everyone" ON feed_likes;
  CREATE POLICY "Feed likes are viewable by everyone" ON feed_likes FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
  CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);

  -- User & Admin operations
  DROP POLICY IF EXISTS "Users can insert their own reviews" ON reviews;
  CREATE POLICY "Users can insert their own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can manage their profile" ON profiles;
  CREATE POLICY "Users can manage their profile" ON profiles FOR ALL USING (auth.uid() = id);

  DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
  CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Admin', 'Asesor')));

  DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
  CREATE POLICY "Users can create their own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can update their orders" ON orders;
  CREATE POLICY "Users can update their orders" ON orders FOR UPDATE USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Admin', 'Asesor')));

  DROP POLICY IF EXISTS "Users can view order items" ON order_items;
  CREATE POLICY "Users can view order items" ON order_items FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()) OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Admin', 'Asesor'))
  );

  DROP POLICY IF EXISTS "Users can create order items" ON order_items;
  CREATE POLICY "Users can create order items" ON order_items FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

  DROP POLICY IF EXISTS "Users can view transactions" ON transactions;
  CREATE POLICY "Users can view transactions" ON transactions FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Admin', 'Asesor')));

  DROP POLICY IF EXISTS "Users can create transactions" ON transactions;
  CREATE POLICY "Users can create transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can create feed posts" ON feed_posts;
  CREATE POLICY "Users can create feed posts" ON feed_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can create feed comments" ON feed_comments;
  CREATE POLICY "Users can create feed comments" ON feed_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can toggle feed likes" ON feed_likes;
  CREATE POLICY "Users can toggle feed likes" ON feed_likes FOR ALL USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can view support conversations" ON support_conversations;
  CREATE POLICY "Users can view support conversations" ON support_conversations FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Admin', 'Asesor')));

  DROP POLICY IF EXISTS "Users can create support conversations" ON support_conversations;
  CREATE POLICY "Users can create support conversations" ON support_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can view support messages" ON support_messages;
  CREATE POLICY "Users can view support messages" ON support_messages FOR SELECT USING (
    conversation_id IN (SELECT id FROM support_conversations WHERE user_id = auth.uid()) OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Admin', 'Asesor'))
  );

  DROP POLICY IF EXISTS "Users can insert support messages" ON support_messages;
  CREATE POLICY "Users can insert support messages" ON support_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

  DROP POLICY IF EXISTS "Users can manage push subscriptions" ON push_subscriptions;
  CREATE POLICY "Users can manage push subscriptions" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can view notifications" ON notification_logs;
  CREATE POLICY "Users can view notifications" ON notification_logs FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Admin', 'Asesor')));

  DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
  CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Admins can manage subcategories" ON subcategories;
  CREATE POLICY "Admins can manage subcategories" ON subcategories FOR ALL USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Admins can manage products" ON products;
  CREATE POLICY "Admins can manage products" ON products FOR ALL USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Admins can update config" ON config;
  CREATE POLICY "Admins can update config" ON config FOR ALL USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Admins can manage coupons" ON coupons;
  CREATE POLICY "Admins can manage coupons" ON coupons FOR ALL USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Admins can manage supplier integrations" ON supplier_integrations;
  CREATE POLICY "Admins can manage supplier integrations" ON supplier_integrations FOR ALL USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Admins can manage credentials stock" ON credentials_stock;
  CREATE POLICY "Admins can manage credentials stock" ON credentials_stock FOR ALL USING (auth.role() = 'authenticated');
END $$;

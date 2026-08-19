-- ==============================================================================
-- MIGRATION: 20260819024500_complete_features_schema.sql
-- Completes all required tables and columns for ALVSHOP:
-- 1. Branding & Dynamic Config (Logos, Favicon, Colors, Banners, Discounts, SEO/Scripts)
-- 2. Button customization on Products ('Comprar' vs 'Solicitar')
-- 3. Coupons & Promo Codes
-- 4. Digital Credential Inventory (Streaming Accounts, PINs)
-- 5. Community Feed (Posts, Comments, Likes)
-- 6. Support Chat (Conversations & Messages)
-- 7. No-Code API Connector (Supplier Integrations)
-- 8. Push Notification Subscriptions & Notification Logs
-- ==============================================================================

-- 1. EXTEND CONFIG TABLE FOR BRANDING, DISCOUNTS & SEO INJECTION
ALTER TABLE config 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS favicon_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#ec4899',
ADD COLUMN IF NOT EXISTS banners JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS site_title TEXT DEFAULT 'ALVSHOP - Recargas y Bienes Digitales',
ADD COLUMN IF NOT EXISTS site_description TEXT DEFAULT 'Plataforma líder en recargas de juegos y cuentas digitales.',
ADD COLUMN IF NOT EXISTS custom_head_scripts TEXT,
ADD COLUMN IF NOT EXISTS discount_offer_pct NUMERIC(5,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS discount_special_pct NUMERIC(5,2) DEFAULT 10.00;

-- 2. EXTEND PRODUCTS TABLE FOR BUTTON ACTION TEXT
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS button_action_text TEXT DEFAULT 'Comprar';

-- 3. COUPONS & PROMO CODES TABLE
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value NUMERIC(10,2) NOT NULL,
  min_purchase_usdt NUMERIC(10,2) DEFAULT 0.00,
  max_uses INT,
  used_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DIGITAL CREDENTIALS INVENTORY (STREAMING MODULE)
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

-- 5. COMMUNITY FEED (POSTS, COMMENTS, LIKES)
CREATE TABLE IF NOT EXISTS feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT DEFAULT 'image', -- 'image', 'video', 'embed'
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

-- 6. SUPPORT CHAT (CONVERSATIONS & MESSAGES)
CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'open', -- 'open', 'resolved', 'closed'
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

-- 7. NO-CODE API CONNECTOR (SUPPLIER INTEGRATIONS)
CREATE TABLE IF NOT EXISTS supplier_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  http_method TEXT DEFAULT 'POST',
  headers JSONB DEFAULT '{}'::jsonb,
  body_template JSONB DEFAULT '{}'::jsonb,
  response_mapping JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PUSH NOTIFICATIONS (SUBSCRIPTIONS & NOTIFICATION LOGS)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL, -- 'order_completed', 'support_reply', 'feed_interaction', 'admin_new_order'
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for all new tables
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Public & User RLS Policies for new tables
CREATE POLICY "Coupons are viewable by everyone" ON coupons FOR SELECT USING (true);
CREATE POLICY "Feed posts are viewable by everyone" ON feed_posts FOR SELECT USING (true);
CREATE POLICY "Feed comments are viewable by everyone" ON feed_comments FOR SELECT USING (true);
CREATE POLICY "Feed likes are viewable by everyone" ON feed_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create feed posts" ON feed_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can create feed comments" ON feed_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can toggle feed likes" ON feed_likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their support conversations" ON support_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create support conversations" ON support_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view messages in their conversations" ON support_messages FOR SELECT USING (
  conversation_id IN (SELECT id FROM support_conversations WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert messages in their conversations" ON support_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

CREATE POLICY "Users can manage their push subscriptions" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their notifications" ON notification_logs FOR SELECT USING (auth.uid() = user_id);

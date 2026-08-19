-- Create Enums
CREATE TYPE user_role AS ENUM ('Admin', 'Asesor', 'Revendedor', 'Cliente Especial', 'Cliente Oferta', 'Cliente Común');
CREATE TYPE order_status AS ENUM ('Pending', 'Verification', 'Completed', 'Rejected');
CREATE TYPE payment_method AS ENUM ('Manual', 'Wallet');

-- Profiles Table (Extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'Cliente Común',
  full_name TEXT,
  phone TEXT,
  country TEXT,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES profiles(id),
  wallet_balance NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Config Table (For exchange rate and bank accounts)
CREATE TABLE config (
  id INT PRIMARY KEY DEFAULT 1,
  usdt_gtq_rate NUMERIC(10, 4) NOT NULL DEFAULT 7.8000,
  bank_accounts JSONB DEFAULT '[]'::jsonb,
  social_links JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subcategories
CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
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
  requires_validation BOOLEAN DEFAULT false, -- For things like Free Fire UID
  validation_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Dynamic Fields (Form Builder)
CREATE TABLE product_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT DEFAULT 'text',
  is_required BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  total_usdt NUMERIC(12, 2) NOT NULL,
  total_gtq NUMERIC(12, 2) NOT NULL,
  status order_status DEFAULT 'Pending',
  payment_method payment_method DEFAULT 'Manual',
  bank_receipt_url TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  price_usdt NUMERIC(12, 2) NOT NULL,
  fields_data JSONB DEFAULT '{}'::jsonb, -- Store the user input (UID, PIN, etc)
  credentials_delivered TEXT, -- Store delivered pins/emails if applicable
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- Deposit, Purchase, Refund
  amount_usdt NUMERIC(12, 2) NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Config
INSERT INTO config (id, usdt_gtq_rate, bank_accounts) 
VALUES (
  1, 
  7.80, 
  '[{"bank": "Banrural", "account_number": "4313076359", "type": "Ahorro", "name": "Jonathan Alvares"}]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- RLS Setup (Row Level Security) - Basic Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Select Policies (Public read for products and config)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Config is viewable by everyone" ON config FOR SELECT USING (true);
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Subcategories are viewable by everyone" ON subcategories FOR SELECT USING (true);
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Product fields are viewable by everyone" ON product_fields FOR SELECT USING (true);
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);

-- User specific Policies
CREATE POLICY "Users can insert their own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own order items" ON order_items FOR SELECT USING (
  order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create their own order items" ON order_items FOR INSERT WITH CHECK (
  order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);

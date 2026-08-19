-- ==============================================================================
-- MIGRATION: 20260819031500_admin_rls_and_categories.sql
-- Grants full CRUD access to Admins & Asesores for Categories, Products, Config, Coupons
-- ==============================================================================

-- Categories CRUD for authenticated users/admins
CREATE POLICY "Admins can manage categories" ON categories 
FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Admin', 'Asesor'))
  OR auth.role() = 'authenticated'
);

-- Subcategories CRUD
CREATE POLICY "Admins can manage subcategories" ON subcategories 
FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Admin', 'Asesor'))
  OR auth.role() = 'authenticated'
);

-- Products CRUD
CREATE POLICY "Admins can manage products" ON products 
FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Admin', 'Asesor'))
  OR auth.role() = 'authenticated'
);

-- Config update
CREATE POLICY "Admins can update config" ON config 
FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Admin', 'Asesor'))
  OR auth.role() = 'authenticated'
);

-- Coupons CRUD
CREATE POLICY "Admins can manage coupons" ON coupons 
FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Admin', 'Asesor'))
  OR auth.role() = 'authenticated'
);

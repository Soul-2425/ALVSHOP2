-- ==============================================================================
-- MIGRATION: 20260821010500_product_fields_rls.sql
-- Grants full CRUD access to Admins & Asesores on product_fields
-- ==============================================================================

CREATE POLICY "Admins can manage product fields" ON product_fields 
FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Admin', 'Asesor'))
  OR auth.role() = 'authenticated'
);

-- ==============================================================================
-- MIGRATION: 20260819030000_dynamic_theme_colors.sql
-- Adds explicit color palette fields to config for Admin dynamic theme customization:
-- background_color (Negro Carbón), primary_color (Azul Marino), accent_color (Cyan Neón)
-- ==============================================================================

ALTER TABLE config 
ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#0a0d14',
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#06b6d4';

-- Update default config with the client's requested initial palette
UPDATE config 
SET 
  background_color = '#0a0d14',
  primary_color = '#1e3a8a',
  accent_color = '#06b6d4',
  secondary_color = '#0284c7'
WHERE id = 1;

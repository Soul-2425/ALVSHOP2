-- ==============================================================================
-- MIGRATION: 20260819034000_truncate_seed_categories.sql
-- Empties categories and subcategories so the store starts clean with 0 categories
-- ==============================================================================

DELETE FROM subcategories;
DELETE FROM categories;

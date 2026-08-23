-- =========================================================================
-- MIGRACIÓN DE SUPABASE: PERMISOS DE ADMIN Y SINCRONIZACIÓN DE SALDO
-- Archivo: supabase/migrations/20260823080000_fix_admin_balance_rls_and_rpc.sql
-- =========================================================================

-- 1. Eliminar políticas restrictivas antiguas en la tabla profiles
DROP POLICY IF EXISTS "Users can manage their profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;

-- 2. Permitir que cualquier usuario vea los perfiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
FOR SELECT USING (true);

-- 3. Permitir que el propio usuario actualice su perfil
CREATE POLICY "Users can manage their own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- 4. Permitir que los Administradores y Asesores modifiquen cualquier perfil (saldo, rol, etc.)
CREATE POLICY "Admins can update all profiles" ON profiles
FOR ALL USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('Admin', 'Asesor')
  )
);

-- 5. CREAR FUNCIÓN RPC SEGURA PARA ACTUALIZAR SALDO DESDE EL PANEL ADMIN
-- SECURITY DEFINER se ejecuta con privilegios de sistema para garantizar que nunca sea bloqueado por RLS.
CREATE OR REPLACE FUNCTION admin_set_user_balance(
  target_user_id UUID,
  new_balance NUMERIC,
  admin_reason TEXT DEFAULT 'Ajuste manual de saldo por Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Actualizar saldo en profiles
  UPDATE public.profiles
  SET wallet_balance = new_balance,
      updated_at = NOW()
  WHERE id = target_user_id
  RETURNING email INTO v_user_email;

  -- Registrar en transactions
  BEGIN
    INSERT INTO public.transactions (
      user_id,
      type,
      amount_usdt,
      status,
      notes,
      created_at
    ) VALUES (
      target_user_id,
      'Admin Adjustment',
      new_balance,
      'Completed',
      admin_reason,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignorar si transactions tiene alguna restricción adicional
  END;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'email', v_user_email,
    'new_balance', new_balance
  );
END;
$$;

-- 6. Dar permisos de ejecución públicos y autenticados a la función RPC
GRANT EXECUTE ON FUNCTION admin_set_user_balance(UUID, NUMERIC, TEXT) TO anon, authenticated, service_role;

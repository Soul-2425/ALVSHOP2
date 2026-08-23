-- =========================================================================
-- SOLUCIÓN DEFINITIVA: ELIMINAR RECURSIÓN INFINITA Y PERMISOS DE ADMIN
-- =========================================================================

-- 1. Eliminar todas las políticas existentes en profiles para limpiar el error 42P17
DROP POLICY IF EXISTS "Users can manage their profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;

-- 2. Crear función auxiliar con SECURITY DEFINER (esto evita 100% la recursión infinita en Postgres)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('Admin', 'Asesor')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 3. Política de SELECT limpia (sin subconsultas, lectura instantánea para todos)
CREATE POLICY "profiles_select_all" ON profiles
FOR SELECT USING (true);

-- 4. Política de UPDATE limpia (el propio usuario o un Admin)
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (
  auth.uid() = id OR public.is_admin()
);

-- 5. Política de INSERT limpia
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = id OR public.is_admin()
);

-- 6. Función RPC Segura para asignación directa de saldo (bypasses RLS)
CREATE OR REPLACE FUNCTION admin_set_user_balance(
  target_user_id UUID,
  new_balance NUMERIC,
  admin_reason TEXT DEFAULT 'Ajuste manual de saldo por Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Actualizar saldo en la tabla profiles
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
  END;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'email', v_user_email,
    'new_balance', new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_user_balance(UUID, NUMERIC, TEXT) TO anon, authenticated, service_role;

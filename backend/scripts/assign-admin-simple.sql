-- Update user role field to Admin
UPDATE users 
SET role = 'Admin' 
WHERE email = 'admin@acme.local';

-- Get user_id and tenant_id
DO $$
DECLARE
  v_user_id INT;
  v_tenant_id INT;
  v_admin_role_id INT;
BEGIN
  -- Get user info
  SELECT id, tenant_id INTO v_user_id, v_tenant_id
  FROM users 
  WHERE email = 'admin@acme.local';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User admin@acme.local not found';
    RETURN;
  END IF;
  
  -- Get Admin role
  SELECT id INTO v_admin_role_id
  FROM roles
  WHERE name = 'Admin' AND tenant_id = v_tenant_id;
  
  IF v_admin_role_id IS NULL THEN
    RAISE NOTICE 'Admin role not found for tenant';
    RETURN;
  END IF;
  
  -- Insert or update user_role
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_user_id, v_admin_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  RAISE NOTICE 'Admin role assigned to admin@acme.local';
END $$;

-- Verify
SELECT 
  u.email,
  u.role as user_role_field,
  r.name as assigned_role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'admin@acme.local';

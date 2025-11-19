-- Assign Admin role to admin@acme.com user

-- First, check if user exists
SELECT id, email FROM users WHERE email = 'admin@acme.com';

-- Check if Admin role exists
SELECT id, name FROM roles WHERE name = 'Admin';

-- Assign Admin role (replace user_id and role_id with actual IDs from above)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@acme.com' 
  AND r.name = 'Admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = u.id AND ur.role_id = r.id
  );

-- Verify
SELECT u.email, r.name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'admin@acme.com';

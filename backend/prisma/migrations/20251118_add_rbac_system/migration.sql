-- Add departments table
CREATE TABLE "departments" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "parent_id" INTEGER,
  "manager_id" INTEGER,
  "description" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL
);

-- Add roles table
CREATE TABLE "roles" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" INTEGER NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "is_system" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  UNIQUE ("tenant_id", "name")
);

-- Add permissions table
CREATE TABLE "permissions" (
  "id" SERIAL PRIMARY KEY,
  "resource" VARCHAR(100) NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "description" TEXT,
  UNIQUE ("resource", "action")
);

-- Add role_permissions junction table
CREATE TABLE "role_permissions" (
  "role_id" INTEGER NOT NULL,
  "permission_id" INTEGER NOT NULL,
  PRIMARY KEY ("role_id", "permission_id"),
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
  FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
);

-- Add user_roles junction table (support multiple roles per user)
CREATE TABLE "user_roles" (
  "user_id" INTEGER NOT NULL,
  "role_id" INTEGER NOT NULL,
  "assigned_at" TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY ("user_id", "role_id"),
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
);

-- Add department_id to users table
ALTER TABLE "users" ADD COLUMN "department_id" INTEGER;
ALTER TABLE "users" ADD COLUMN "full_name" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "phone" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN "avatar_url" VARCHAR(500);
ALTER TABLE "users" ADD CONSTRAINT "fk_users_department" 
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL;

-- Add manager foreign key to departments
ALTER TABLE "departments" ADD CONSTRAINT "fk_departments_manager" 
  FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL;

-- Insert default permissions
INSERT INTO "permissions" ("resource", "action", "description") VALUES
  -- User management
  ('users', 'create', 'Create new users'),
  ('users', 'read', 'View user information'),
  ('users', 'update', 'Update user information'),
  ('users', 'delete', 'Delete users'),
  ('users', 'manage_roles', 'Assign roles to users'),
  
  -- Department management
  ('departments', 'create', 'Create departments'),
  ('departments', 'read', 'View departments'),
  ('departments', 'update', 'Update departments'),
  ('departments', 'delete', 'Delete departments'),
  
  -- Document management
  ('documents', 'create', 'Upload documents'),
  ('documents', 'read', 'View documents'),
  ('documents', 'update', 'Update documents'),
  ('documents', 'delete', 'Delete documents'),
  ('documents', 'share', 'Share documents'),
  
  -- Sign request management
  ('sign_requests', 'create', 'Create sign requests'),
  ('sign_requests', 'read', 'View sign requests'),
  ('sign_requests', 'update', 'Update sign requests'),
  ('sign_requests', 'delete', 'Delete sign requests'),
  ('sign_requests', 'approve', 'Approve sign requests'),
  
  -- Role management
  ('roles', 'create', 'Create custom roles'),
  ('roles', 'read', 'View roles'),
  ('roles', 'update', 'Update roles'),
  ('roles', 'delete', 'Delete roles'),
  
  -- Audit logs
  ('audit_logs', 'read', 'View audit logs'),
  ('audit_logs', 'export', 'Export audit logs'),
  
  -- Settings
  ('settings', 'read', 'View settings'),
  ('settings', 'update', 'Update settings');

-- Create indexes
CREATE INDEX "idx_departments_tenant" ON "departments"("tenant_id");
CREATE INDEX "idx_departments_parent" ON "departments"("parent_id");
CREATE INDEX "idx_roles_tenant" ON "roles"("tenant_id");
CREATE INDEX "idx_users_department" ON "users"("department_id");
CREATE INDEX "idx_user_roles_user" ON "user_roles"("user_id");
CREATE INDEX "idx_user_roles_role" ON "user_roles"("role_id");

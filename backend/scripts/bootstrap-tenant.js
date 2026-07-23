const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const permissionCatalog = [
  ["users", "create", "Create new users"],
  ["users", "read", "View user information"],
  ["users", "update", "Update user information"],
  ["users", "delete", "Delete users"],
  ["users", "manage_roles", "Assign roles to users"],
  ["departments", "create", "Create departments"],
  ["departments", "read", "View departments"],
  ["departments", "update", "Update departments"],
  ["departments", "delete", "Delete departments"],
  ["documents", "create", "Upload documents"],
  ["documents", "read", "View documents"],
  ["documents", "update", "Update documents"],
  ["documents", "delete", "Delete documents"],
  ["documents", "share", "Share documents"],
  ["document_types", "create", "Create document types"],
  ["document_types", "read", "View document types"],
  ["document_types", "update", "Update document types"],
  ["document_types", "delete", "Delete document types"],
  ["sign_requests", "create", "Create sign requests"],
  ["sign_requests", "read", "View sign requests"],
  ["sign_requests", "update", "Update sign requests"],
  ["sign_requests", "delete", "Delete sign requests"],
  ["sign_requests", "approve", "Approve sign requests"],
  ["workflows", "create", "Create workflows"],
  ["workflows", "read", "View workflows"],
  ["workflows", "update", "Update workflows"],
  ["workflows", "delete", "Delete workflows"],
  ["approvals", "create", "Create approvals"],
  ["approvals", "read", "View approvals"],
  ["approvals", "update", "Update approvals"],
  ["approvals", "delete", "Delete approvals"],
  ["positions", "create", "Create positions"],
  ["positions", "read", "View positions"],
  ["positions", "update", "Update positions"],
  ["positions", "delete", "Delete positions"],
  ["external_orgs", "create", "Create external organizations"],
  ["external_orgs", "read", "View external organizations"],
  ["external_orgs", "update", "Update external organizations"],
  ["external_orgs", "delete", "Delete external organizations"],
  ["webhooks", "create", "Create webhooks"],
  ["webhooks", "read", "View webhooks"],
  ["webhooks", "update", "Update webhooks"],
  ["webhooks", "delete", "Delete webhooks"],
  ["roles", "create", "Create custom roles"],
  ["roles", "read", "View roles"],
  ["roles", "update", "Update roles"],
  ["roles", "delete", "Delete roles"],
  ["audit_logs", "read", "View audit logs"],
  ["audit_logs", "export", "Export audit logs"],
  ["settings", "read", "View settings"],
  ["settings", "update", "Update settings"],
  ["settings", "manage", "Manage system settings"],
];

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const workspaceName = required("BOOTSTRAP_WORKSPACE_NAME");
  const ownerEmail = required("BOOTSTRAP_OWNER_EMAIL").toLowerCase();
  const ownerName = required("BOOTSTRAP_OWNER_NAME");
  const ownerPassword = required("BOOTSTRAP_OWNER_PASSWORD");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    throw new Error("BOOTSTRAP_OWNER_EMAIL must be a valid email address");
  }
  if (ownerPassword.length < 16) {
    throw new Error("BOOTSTRAP_OWNER_PASSWORD must contain at least 16 characters");
  }

  const [existingUser, existingTenant] = await Promise.all([
    prisma.users.findUnique({ where: { email: ownerEmail } }),
    prisma.tenants.findFirst({ where: { name: workspaceName } }),
  ]);
  if (existingUser) throw new Error("An account with BOOTSTRAP_OWNER_EMAIL already exists");
  if (existingTenant) throw new Error("A tenant with BOOTSTRAP_WORKSPACE_NAME already exists");

  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  const result = await prisma.$transaction(async (tx) => {
    for (const [resource, action, description] of permissionCatalog) {
      await tx.permissions.upsert({
        where: { resource_action: { resource, action } },
        update: { description },
        create: { resource, action, description },
      });
    }

    const tenant = await tx.tenants.create({
      data: { name: workspaceName, status: "active", plan: "self-hosted" },
    });
    const owner = await tx.users.create({
      data: {
        tenant_id: tenant.id,
        email: ownerEmail,
        full_name: ownerName,
        password_hash: passwordHash,
        role: "admin",
        status: "active",
      },
    });

    const roles = {};
    for (const role of [
      ["Admin", "Tenant administrator"],
      ["User", "Standard user"],
      ["Viewer", "Read-only user"],
    ]) {
      roles[role[0]] = await tx.roles.create({
        data: {
          tenant_id: tenant.id,
          name: role[0],
          description: role[1],
          is_system: true,
        },
      });
    }

    const permissions = await tx.permissions.findMany({
      where: { NOT: { resource: "archive", action: "delete_permanently" } },
    });
    const userPermissions = permissions.filter(
      (permission) =>
        (["documents", "sign_requests"].includes(permission.resource) &&
          ["create", "read"].includes(permission.action)) ||
        (permission.resource === "approvals" &&
          ["create", "read", "update"].includes(permission.action)),
    );
    const viewerPermissions = permissions.filter(
      (permission) => permission.action === "read",
    );

    await tx.role_permissions.createMany({
      data: permissions.map((permission) => ({
        role_id: roles.Admin.id,
        permission_id: permission.id,
      })),
      skipDuplicates: true,
    });
    await tx.role_permissions.createMany({
      data: userPermissions.map((permission) => ({
        role_id: roles.User.id,
        permission_id: permission.id,
      })),
      skipDuplicates: true,
    });
    await tx.role_permissions.createMany({
      data: viewerPermissions.map((permission) => ({
        role_id: roles.Viewer.id,
        permission_id: permission.id,
      })),
      skipDuplicates: true,
    });
    await tx.user_roles.create({
      data: { user_id: owner.id, role_id: roles.Admin.id },
    });

    return { tenantId: tenant.id, ownerId: owner.id };
  });

  console.log("Tenant bootstrap completed.");
  console.log(`Tenant ID: ${result.tenantId}`);
  console.log(`Owner user ID: ${result.ownerId}`);
  console.log(`Owner email: ${ownerEmail}`);
}

main()
  .catch((error) => {
    console.error(`[bootstrap-tenant] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

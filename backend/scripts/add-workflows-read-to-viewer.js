/**
 * Script: Add workflows:read permission to Viewer role
 * 
 * Viewer role needs to read workflows when uploading documents
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addWorkflowsReadToViewer() {
  try {
    console.log('🔧 Adding workflows:read permission to Viewer role...\n');

    // Get all tenants
    const tenants = await prisma.tenants.findMany();
    console.log(`📋 Found ${tenants.length} tenant(s)\n`);

    for (const tenant of tenants) {
      console.log(`🏢 Tenant: ${tenant.name || tenant.id}`);

      // Get Viewer role
      const viewerRole = await prisma.roles.findFirst({
        where: {
          tenant_id: tenant.id,
          name: { contains: 'Viewer', mode: 'insensitive' }
        }
      });

      if (!viewerRole) {
        console.log('   ⚠️ Viewer role not found, skipping...\n');
        continue;
      }

      console.log(`   ✅ Found Viewer role (ID: ${viewerRole.id})`);

      // Get workflows:read permission
      const permission = await prisma.permissions.findFirst({
        where: {
          resource: 'workflows',
          action: 'read'
        }
      });

      if (!permission) {
        console.log('   ❌ workflows:read permission not found!\n');
        continue;
      }

      console.log(`   ✅ Found workflows:read permission (ID: ${permission.id})`);

      // Check if already assigned
      const existing = await prisma.role_permissions.findUnique({
        where: {
          role_id_permission_id: {
            role_id: viewerRole.id,
            permission_id: permission.id
          }
        }
      });

      if (existing) {
        console.log('   ℹ️ Permission already assigned\n');
        continue;
      }

      // Assign permission
      await prisma.role_permissions.create({
        data: {
          role_id: viewerRole.id,
          permission_id: permission.id
        }
      });

      console.log('   ✅ Permission assigned!\n');
    }

    console.log('🎉 Done!\n');

    // Show summary
    console.log('📊 Summary:');
    const allViewerRoles = await prisma.roles.findMany({
      where: {
        name: { contains: 'Viewer', mode: 'insensitive' }
      },
      include: {
        role_permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    for (const role of allViewerRoles) {
      console.log(`\n   Role: ${role.name} (ID: ${role.id})`);
      console.log(`   Permissions: ${role.role_permissions.length}`);
      
      const workflowPerms = role.role_permissions.filter(rp => 
        rp.permission.resource === 'workflows'
      );
      
      if (workflowPerms.length > 0) {
        console.log('   Workflows permissions:');
        workflowPerms.forEach(rp => {
          console.log(`     - workflows:${rp.permission.action}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addWorkflowsReadToViewer();

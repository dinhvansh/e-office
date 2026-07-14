import { SidebarGroup, SidebarItem } from '@/constants/sidebarItems';

/**
 * Check if user has required role
 */
export function hasRequiredRole(userRole: string | null | undefined, requiredRoles?: string[]): boolean {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true; // No role requirement
  }
  
  if (!userRole) {
    return false; // User has no role
  }

  const normalizedUserRole = userRole.toLowerCase() === 'super_admin' ? 'admin' : userRole.toLowerCase();
  const normalizedRequiredRoles = requiredRoles.map((role) => role.toLowerCase());

  return normalizedRequiredRoles.includes(normalizedUserRole);
}

export function hasRequiredPermissions(
  userRole: string | null | undefined,
  userPermissions: string[] | null | undefined,
  requiredPermissions?: string[],
): boolean {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  if (userRole?.toLowerCase() === 'super_admin') {
    return true;
  }

  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  return requiredPermissions.every((permission) => userPermissions.includes(permission));
}

/**
 * Filter sidebar items based on user permissions
 */
export function filterSidebarByPermissions(
  sidebarStructure: SidebarGroup[],
  userRole: string | null | undefined,
  userPermissions: string[] | null | undefined,
): SidebarGroup[] {
  return sidebarStructure
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          hasRequiredRole(userRole, item.requiredRoles) &&
          hasRequiredPermissions(userRole, userPermissions, item.requiredPermissions),
      ),
    }))
    .filter((group) => group.items.length > 0); // Remove empty groups
}

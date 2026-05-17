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

/**
 * Filter sidebar items based on user permissions
 */
export function filterSidebarByPermissions(
  sidebarStructure: SidebarGroup[],
  userRole: string | null | undefined
): SidebarGroup[] {
  return sidebarStructure
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasRequiredRole(userRole, item.requiredRoles)),
    }))
    .filter((group) => group.items.length > 0); // Remove empty groups
}

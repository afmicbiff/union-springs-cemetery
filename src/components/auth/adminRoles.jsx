/**
 * Admin Role Configuration
 * 
 * Board member roles that have admin-level access to the site.
 * These roles can access the Admin Dashboard and other protected areas.
 */

// Board member roles with admin-level access
export const ADMIN_ROLES = [
  'admin',
  'President',
  'Vice President', 
  'Legal',
  'Treasurer',
  'Secretary',
  'Caretaker',
  'Administrator'
];

/**
 * Check if a user role has admin-level access
 * @param {string} userRole - The user's role
 * @returns {boolean} - True if the role has admin access
 */
export function isAdminRole(userRole) {
  if (!userRole) return false;
  return ADMIN_ROLES.includes(userRole);
}

/**
 * Check if user object has admin-level access
 * @param {object} user - The user object with role property
 * @returns {boolean} - True if the user has admin access
 */
export function hasAdminAccess(user) {
  if (!user) return false;
  return isAdminRole(user.role);
}

export default ADMIN_ROLES;
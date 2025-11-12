import { get, query, exec } from '../db/db.js';

export function getRoleByName(name) {
  return get(`SELECT id, name FROM roles WHERE name=@name`, { name });
}

export function getUserRoles(userId) {
  return query(`SELECT r.id, r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id=@userId`, { userId });
}

export function assignRoleToUser(userId, roleName) {
  const role = getRoleByName(roleName);
  if (!role) return false;
  try {
    exec(`INSERT INTO user_roles (user_id, role_id) VALUES (@userId, @roleId)`, { userId, roleId: role.id });
    return true;
  } catch (e) {
    return false; // duplicate or error
  }
}

export function getPermissionsForRoles(roleIds) {
  if (!roleIds.length) return [];
  const placeholders = roleIds.map((_, i) => `@r${i}`).join(',');
  const params = roleIds.reduce((acc, id, i) => { acc[`r${i}`] = id; return acc; }, {});
  const rows = query(`SELECT DISTINCT p.code FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id IN (${placeholders})`, params);
  return rows.map(r => r.code);
}

export function getUserPermissions(userId) {
  const roles = getUserRoles(userId);
  const roleIds = roles.map(r => r.id);
  return getPermissionsForRoles(roleIds);
}

export function userHasPermission(userId, permissionCode) {
  const perms = getUserPermissions(userId);
  return perms.includes(permissionCode);
}

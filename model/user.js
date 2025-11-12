import { exec, get } from "../db/db.js";
import { assignRoleToUser } from "./rbac.js";

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getUserById(id) {
  const row = get(
    `SELECT id, username, email, role, created_at, updated_at
     FROM users
     WHERE id = @id`,
    { id }
  );
  return mapUser(row);
}

export function getUserWithPasswordByLogin(login) {
  // login may be username or email
  const row = get(
    `SELECT id, username, email, password, role, created_at, updated_at
     FROM users
     WHERE username = @login OR email = @login`,
    { login }
  );
  return row || null;
}

export function createUser({ username, email, passwordHash, role = "user" }) {
  const result = exec(
    `INSERT INTO users (username, email, password, role)
     VALUES (@username, @email, @passwordHash, @role)`,
    { username, email, passwordHash, role }
  );
  const created = getUserById(result.lastInsertRowid);
  // автоматически выдадим роль в RBAC-таблицах
  assignRoleToUser(created.id, role);
  return created;
}

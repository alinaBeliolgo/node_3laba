import db, { exec } from "../db/db.js";

export function createTables() {
	db.exec("PRAGMA foreign_keys = ON");

	// Users table
	exec(
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username VARCHAR(50) NOT NULL UNIQUE,
			email VARCHAR(100) NOT NULL UNIQUE,
			password TEXT NOT NULL,
			role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`
	);

	// RBAC tables
	exec(
		`CREATE TABLE IF NOT EXISTS roles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name VARCHAR(50) NOT NULL UNIQUE
		)`
	);

	exec(
		`CREATE TABLE IF NOT EXISTS permissions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			code VARCHAR(100) NOT NULL UNIQUE
		)`
	);

	exec(
		`CREATE TABLE IF NOT EXISTS role_permissions (
			role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
			permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
			PRIMARY KEY (role_id, permission_id)
		)`
	);

	exec(
		`CREATE TABLE IF NOT EXISTS user_roles (
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
			PRIMARY KEY (user_id, role_id)
		)`
	);

	exec(
		`CREATE TABLE IF NOT EXISTS categories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name VARCHAR(100) NOT NULL UNIQUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`
	);

	exec(
		`CREATE TABLE IF NOT EXISTS todos (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL CHECK (length(title) BETWEEN 2 AND 120),
			completed INTEGER DEFAULT 0 CHECK (completed IN (0, 1)),
			category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
			due_date TIMESTAMP,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`
	);

	// Ensure todos.user_id column exists and is indexed
	const todoColumns = db.prepare("PRAGMA table_info(todos)").all();
	const hasUserId = todoColumns.some((c) => c.name === "user_id");
	if (!hasUserId) {
		// Add column with FK to users
		exec(
			`ALTER TABLE todos ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`
		);
	}

	exec(
		`CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category_id)`
	);

	exec(
		`CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed)`
	);

	exec(
		`CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id)`
	);

	// Seed default RBAC data if empty
	const rolesCount = db.prepare("SELECT COUNT(*) as c FROM roles").get().c;
	if (rolesCount === 0) {
		exec(`INSERT INTO roles (name) VALUES ('admin'),('user')`);

		const perms = [
			'TODO_CREATE','TODO_READ','TODO_UPDATE','TODO_DELETE','TODO_READ_ALL',
			'CATEGORY_CREATE','CATEGORY_UPDATE','CATEGORY_DELETE'
		];
		const insertPerm = db.prepare(`INSERT INTO permissions (code) VALUES (@code)`);
		const insertPermTx = db.transaction((items) => {
			for (const code of items) insertPerm.run({ code });
		});
		insertPermTx(perms);

		// map role names to ids
		const roleAdmin = db.prepare(`SELECT id FROM roles WHERE name='admin'`).get().id;
		const roleUser = db.prepare(`SELECT id FROM roles WHERE name='user'`).get().id;

		const permRows = db.prepare(`SELECT id, code FROM permissions`).all();
		const permIdByCode = Object.fromEntries(permRows.map(p => [p.code, p.id]));

		const rpInsert = db.prepare(`INSERT INTO role_permissions (role_id, permission_id) VALUES (@role_id, @permission_id)`);
		const rpTx = db.transaction((pairs) => {
			for (const p of pairs) rpInsert.run(p);
		});

		// admin gets all permissions
		rpTx(permRows.map(p => ({ role_id: roleAdmin, permission_id: p.id })));

		// user gets basic todo permissions (без удаления)
		rpTx([
			{ role_id: roleUser, permission_id: permIdByCode['TODO_CREATE'] },
			{ role_id: roleUser, permission_id: permIdByCode['TODO_READ'] },
			{ role_id: roleUser, permission_id: permIdByCode['TODO_UPDATE'] },
		]);
	}
}

if (process.argv[1] && process.argv[1].endsWith("create.js")) {
	createTables();
	// eslint-disable-next-line no-console
	console.log("Database schema ensured");
}

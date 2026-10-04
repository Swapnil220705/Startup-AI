// backend/db/migrate.js
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Runs all pending migrations against the provided better-sqlite3 database instance.
 * Ensures migrations run inside transactions and are tracked in the `schema_migrations` table.
 * 
 * @param {import('better-sqlite3').Database} db
 * @returns {string[]} List of newly applied migration versions
 */
function runMigrations(db) {
  if (!db) {
    throw new Error('Database instance is required to run migrations.');
  }

  // 1. Ensure migrations tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  // 2. Fetch list of already applied migrations
  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all();
  const appliedSet = new Set(appliedRows.map(row => row.version));

  // 3. Read and sort all migration files in migrations directory
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();

  const newlyApplied = [];

  for (const file of migrationFiles) {
    if (appliedSet.has(file)) {
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Run each migration inside an atomic transaction
    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
        file,
        new Date().toISOString()
      );
    });

    try {
      applyMigration();
      newlyApplied.push(file);
    } catch (err) {
      throw new Error(`Failed to apply migration "${file}": ${err.message}`);
    }
  }

  return newlyApplied;
}

module.exports = {
  runMigrations,
  MIGRATIONS_DIR
};

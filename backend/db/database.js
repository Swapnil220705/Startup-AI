// backend/db/database.js
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { runMigrations } = require('./migrate');

let activeDb = null;

/**
 * Returns default database file path.
 * Can be overridden via DATABASE_PATH environment variable.
 */
function getDefaultDbPath() {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  return path.join(__dirname, '../data/startup_ai.db');
}

/**
 * Instantiates and migrates a SQLite database instance.
 * 
 * @param {string} [dbPath] - File path or ':memory:'
 * @param {object} [options] - Configuration options
 * @param {boolean} [options.migrate=true] - Whether to automatically apply migrations
 * @returns {Database.Database}
 */
function createDatabaseInstance(dbPath, options = {}) {
  const targetPath = dbPath || getDefaultDbPath();
  const shouldMigrate = options.migrate !== false;

  // If writing to disk, ensure directory exists
  if (targetPath !== ':memory:') {
    const dir = path.dirname(path.resolve(targetPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  let db;
  try {
    db = new Database(targetPath);
  } catch (err) {
    throw new Error(`Failed to open database at "${targetPath}": ${err.message}`);
  }

  // Configure SQLite PRAGMAs for safety and performance
  try {
    db.pragma('foreign_keys = ON');
    if (targetPath !== ':memory:') {
      db.pragma('journal_mode = WAL');
    }
  } catch (pragmaErr) {
    db.close();
    throw new Error(`Failed to configure database PRAGMAs: ${pragmaErr.message}`);
  }

  if (shouldMigrate) {
    try {
      runMigrations(db);
    } catch (migErr) {
      db.close();
      throw migErr;
    }
  }

  return db;
}

/**
 * Initializes the singleton application database.
 * 
 * @param {object} [options]
 * @param {string} [options.dbPath] - Custom database path or ':memory:'
 * @param {boolean} [options.migrate=true]
 * @returns {Database.Database}
 */
function initDatabase(options = {}) {
  if (activeDb) {
    return activeDb;
  }

  const dbPath = options.dbPath || getDefaultDbPath();
  activeDb = createDatabaseInstance(dbPath, options);
  return activeDb;
}

/**
 * Returns the currently active singleton database instance.
 * Automatically initializes the default database if not already done.
 * 
 * @returns {Database.Database}
 */
function getDatabase() {
  if (!activeDb) {
    return initDatabase();
  }
  return activeDb;
}

/**
 * Closes the active database connection if open.
 */
function closeDatabase() {
  if (activeDb) {
    try {
      activeDb.close();
    } catch (err) {
      console.error('Error closing database:', err.message);
    } finally {
      activeDb = null;
    }
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  createDatabaseInstance,
  getDefaultDbPath
};

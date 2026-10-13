const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'publicfix.db');

let db;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        throw err;
      }
    });
    // Enable WAL mode and foreign keys
    db.serialize(() => {
      db.run('PRAGMA journal_mode = WAL');
      db.run('PRAGMA foreign_keys = ON');
    });
  }
  return db;
}

// Promise-based query helpers
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function dbExec(sql) {
  return new Promise((resolve, reject) => {
    getDb().exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function initializeDatabase() {
  // Users table
  await dbExec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('citizen', 'officer', 'admin')),
      department TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);

  // Office routing rules
  await dbExec(`
    CREATE TABLE IF NOT EXISTS office_routing_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      area_pattern TEXT,
      office_name TEXT NOT NULL,
      department TEXT NOT NULL,
      priority INTEGER DEFAULT 1,
      demo_target_days INTEGER DEFAULT 7,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_routing_category ON office_routing_rules(category);`);

  // Offices table - stores municipal offices with coordinates and verification flag
  await dbExec(`
    CREATE TABLE IF NOT EXISTS offices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      is_verified INTEGER DEFAULT 1,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_offices_name ON offices(name);`);

  // Mapping between offices and problem categories they handle
  await dbExec(`
    CREATE TABLE IF NOT EXISTS office_categories (
      office_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      PRIMARY KEY (office_id, category),
      FOREIGN KEY (office_id) REFERENCES offices(id)
    );
  `);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_office_categories_category ON office_categories(category);`);

  // Complaints table
  await dbExec(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      location_text TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','ASSIGNED','IN_PROGRESS','AWAITING_VERIFICATION','RESOLVED','REOPENED')),
      citizen_id INTEGER NOT NULL,
      assigned_office TEXT,
      assigned_office_id INTEGER,
      assigned_officer_id INTEGER,
      routing_rule_id INTEGER,
      due_date TEXT,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (citizen_id) REFERENCES users(id),
      FOREIGN KEY (assigned_office_id) REFERENCES offices(id),
      FOREIGN KEY (assigned_officer_id) REFERENCES users(id),
      FOREIGN KEY (routing_rule_id) REFERENCES office_routing_rules(id)
    );
  `);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_complaints_officer ON complaints(assigned_officer_id);`);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_complaints_complaint_id ON complaints(complaint_id);`);

  // Complaint photos
  await dbExec(`
    CREATE TABLE IF NOT EXISTS complaint_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      photo_type TEXT NOT NULL CHECK(photo_type IN ('original', 'completion')),
      filename TEXT NOT NULL,
      original_name TEXT,
      mimetype TEXT,
      size INTEGER,
      uploaded_by INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (complaint_id) REFERENCES complaints(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );
  `);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_photos_complaint ON complaint_photos(complaint_id);`);

  // Status history
  await dbExec(`
    CREATE TABLE IF NOT EXISTS complaint_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_by INTEGER NOT NULL,
      note TEXT,
      changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (complaint_id) REFERENCES complaints(id),
      FOREIGN KEY (changed_by) REFERENCES users(id)
    );
  `);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_history_complaint ON complaint_status_history(complaint_id);`);

  // Verification records
  await dbExec(`
    CREATE TABLE IF NOT EXISTS verification_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      original_photo_id INTEGER,
      completion_photo_id INTEGER,
      ai_verdict TEXT CHECK(ai_verdict IN ('LIKELY_RESOLVED', 'NOT_RESOLVED', 'NEEDS_REVIEW')),
      ai_explanation TEXT,
      ai_evidence TEXT,
      ai_limitations TEXT,
      ai_assessed_at TEXT,
      human_action TEXT CHECK(human_action IN ('CONFIRMED', 'DISPUTED')),
      human_action_by INTEGER,
      human_action_at TEXT,
      dispute_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (complaint_id) REFERENCES complaints(id),
      FOREIGN KEY (original_photo_id) REFERENCES complaint_photos(id),
      FOREIGN KEY (completion_photo_id) REFERENCES complaint_photos(id),
      FOREIGN KEY (human_action_by) REFERENCES users(id)
    );
  `);
  await dbExec(`CREATE INDEX IF NOT EXISTS idx_verification_complaint ON verification_records(complaint_id);`);

  console.log('✅ Database initialized successfully.');
}

module.exports = { getDb, initializeDatabase, dbRun, dbGet, dbAll, dbExec };

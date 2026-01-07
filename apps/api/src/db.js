import Database from "better-sqlite3";

export function openDb(filename = "carecircle-application.db") {
  const db = new Database(filename);
  
  // Enable WAL mode for better performance
  db.exec(`PRAGMA journal_mode = WAL;`);
  
  // Create tables
  db.exec(`
    -- Circles table
    CREATE TABLE IF NOT EXISTS circles(
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      owner TEXT NOT NULL,
      wallet_key TEXT,
      tx_hash TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
  `);
  
  // Migration: Add wallet_key column if it doesn't exist (for existing databases)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(circles)").all();
    const hasWalletKey = tableInfo.some(col => col.name === "wallet_key");
    if (!hasWalletKey) {
      db.exec("ALTER TABLE circles ADD COLUMN wallet_key TEXT");
    }
  } catch (err) {
    // Table might not exist yet, which is fine
    console.log("Migration check:", err.message);
  }
  
  // Continue with other tables
  db.exec(`

    -- Members table (circle membership)
    CREATE TABLE IF NOT EXISTS members(
      circle_id INTEGER NOT NULL,
      address TEXT NOT NULL,
      name TEXT,
      is_owner INTEGER NOT NULL DEFAULT 0,
      tx_hash TEXT,
      joined_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      PRIMARY KEY (circle_id, address)
    );
  `);
  
  // Migration: Add name column if it doesn't exist (for existing databases)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(members)").all();
    const hasName = tableInfo.some(col => col.name === "name");
    if (!hasName) {
      db.exec("ALTER TABLE members ADD COLUMN name TEXT");
    }
  } catch (err) {
    // Table might not exist yet, which is fine
    console.log("Migration check:", err.message);
  }
  
  // Continue with other tables
  db.exec(`

    -- Tasks table
    CREATE TABLE IF NOT EXISTS tasks(
      id INTEGER PRIMARY KEY,
      circle_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to TEXT,
      created_by TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 1,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_by TEXT,
      completed_at INTEGER,
      tx_hash TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
  `);
  
  // Migration: Make assigned_to nullable if it's currently NOT NULL (for existing databases)
  // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
  try {
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const assignedToCol = tableInfo.find(col => col.name === "assigned_to");
    if (assignedToCol && assignedToCol.notnull === 1) {
      console.log("⚠️ Migrating tasks table to allow NULL assigned_to...");
      
      // Create new table with nullable assigned_to
      db.exec(`
        CREATE TABLE IF NOT EXISTS tasks_new(
          id INTEGER PRIMARY KEY,
          circle_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          assigned_to TEXT,
          created_by TEXT NOT NULL,
          priority INTEGER NOT NULL DEFAULT 1,
          payment_amount TEXT,
          completed INTEGER NOT NULL DEFAULT 0,
          completed_by TEXT,
          completed_at INTEGER,
          tx_hash TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
        );
      `);
      
      // Check if payment_amount column exists in old table
      const oldTableInfo = db.prepare("PRAGMA table_info(tasks)").all();
      const hasPaymentAmount = oldTableInfo.some(col => col.name === "payment_amount");
      
      // Copy data from old table to new table
      if (hasPaymentAmount) {
        db.exec(`
          INSERT INTO tasks_new 
          SELECT id, circle_id, title, description, 
                 CASE WHEN assigned_to = '' THEN NULL ELSE assigned_to END,
                 created_by, priority, payment_amount,
                 completed, completed_by, completed_at, tx_hash, created_at
          FROM tasks;
        `);
      } else {
        // Old table doesn't have payment_amount, so insert NULL for it
        db.exec(`
          INSERT INTO tasks_new (id, circle_id, title, description, assigned_to, created_by, priority, payment_amount, completed, completed_by, completed_at, tx_hash, created_at)
          SELECT id, circle_id, title, description, 
                 CASE WHEN assigned_to = '' THEN NULL ELSE assigned_to END,
                 created_by, priority, NULL,
                 completed, completed_by, completed_at, tx_hash, created_at
          FROM tasks;
        `);
      }
      
      // Drop old table and rename new one
      db.exec(`DROP TABLE tasks;`);
      db.exec(`ALTER TABLE tasks_new RENAME TO tasks;`);
      
      // Recreate indexes
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_circle ON tasks(circle_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);`);
      
      console.log("✅ Migration completed: assigned_to is now nullable");
    }
  } catch (err) {
    console.log("Migration check:", err.message);
  }

  // Migration: Add payment_amount column if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const hasPaymentAmount = tableInfo.some(col => col.name === "payment_amount");
    if (!hasPaymentAmount) {
      db.exec("ALTER TABLE tasks ADD COLUMN payment_amount TEXT");
      console.log("✓ Added payment_amount column to tasks table");
    }
  } catch (err) {
    console.log("Migration check for payment_amount:", err.message);
  }
  
  // Continue with other tables
  db.exec(`

    -- Invitations table
    CREATE TABLE IF NOT EXISTS invitations(
      token TEXT PRIMARY KEY,
      circle_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      member_name TEXT NOT NULL,
      inviter_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      expires_at INTEGER,
      accepted_at INTEGER,
      accepted_address TEXT,
      FOREIGN KEY (circle_id) REFERENCES circles(id)
    );
  `);

  // Continue with indexes
  db.exec(`

    -- Indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_tasks_circle ON tasks(circle_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_members_address ON members(address);
    CREATE INDEX IF NOT EXISTS idx_circles_owner ON circles(owner);
    CREATE INDEX IF NOT EXISTS idx_invitations_circle ON invitations(circle_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
    CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
  `);
  
  return db;
}

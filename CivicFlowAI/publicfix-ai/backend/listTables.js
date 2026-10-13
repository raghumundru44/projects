const { getDb } = require('./database/db');
getDb().all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
  if (err) {
    console.error('Error fetching tables:', err);
    process.exit(1);
  }
  console.log('Tables:', rows.map(r => r.name));
});

const { Pool } = require('pg');

const db = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'SompuraSthapatya',
  database: 'EXPORT',
  port: 5432,
});

db.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("❌ DB Connection Error:", err));

module.exports = db;
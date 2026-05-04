const pool = require('./src/config/db');
pool.query('SELECT * FROM users WHERE email = $1', ['admin@kinetic.ai'])
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });

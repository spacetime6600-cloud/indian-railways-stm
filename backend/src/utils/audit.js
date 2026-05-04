'use strict';
const pool = require('../config/db');

/**
 * Write an audit log entry.
 * @param {object} opts
 * @param {string} opts.userId      - UUID of the acting user
 * @param {string} opts.role        - Role of the acting user
 * @param {string} opts.action      - e.g. 'CREATE', 'UPDATE', 'DELETE', 'RESOLVE'
 * @param {string} opts.entityType  - e.g. 'train', 'platform', 'alert', 'maintenance', 'user'
 * @param {string} opts.entityId    - UUID of the affected record
 * @param {object} [opts.oldValue]  - Snapshot before change
 * @param {object} [opts.newValue]  - Snapshot after change
 * @param {object} [opts.client]    - Optional pg client for transaction context
 */
async function writeAudit({ userId, role, action, entityType, entityId, oldValue, newValue, client }) {
  const db = client || pool;
  try {
    await db.query(
      `INSERT INTO logs (user_id, action, module, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        userId || null,
        `${action}:${entityType}`,
        entityType,
        JSON.stringify({
          entityId,
          role,
          action,
          oldValue: oldValue || null,
          newValue: newValue || null,
          ts: new Date().toISOString(),
        }),
      ]
    );
  } catch (err) {
    // Audit failures must never break the main operation
    console.error('[audit] write failed:', err.message);
  }
}

module.exports = { writeAudit };

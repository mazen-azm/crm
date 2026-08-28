// A runtime guard for BR-2: inside a transaction, nothing may change a table
// other than audit_events without an audit_events insert landing in the same
// transaction.
//
// Why not a source scan: a scan matches the comment explaining the rule as
// readily as a breach of it (L-10, L-13), and an AST scan would mean adding a
// parser to api/package.json, which declares one dependency and no dev ones.
// This reads behaviour instead of spelling, so it cannot be argued with.
//
// Two doors, one classifier (L-25). A statement can reach the database through
// db.prepare(sql).run(...) or through db.exec(sql). Wrapping only the first
// would leave db.exec('DELETE FROM users …') committing unaudited through the
// guard written to prevent exactly that.

const AUDIT_TABLE = 'audit_events';

// Strip leading whitespace and -- line comments so the first keyword is the
// first keyword, not whatever the formatter left in front of it.
const lead = (sql) => String(sql).replace(/^(?:\s|--[^\n]*\n?)+/, '');

const TXN = /^(BEGIN|COMMIT|ROLLBACK|END)\b/i;
const MUTATION = /^(INSERT|UPDATE|DELETE|REPLACE)\b/i;
const TABLE = /\b(?:INTO|UPDATE|FROM)\s+["'`[]?([A-Za-z_][A-Za-z0-9_]*)/i;

// null when the statement changes nothing; otherwise the table it changes.
function mutatedTable(sql) {
  const text = lead(sql);
  if (!MUTATION.test(text)) return null;
  return TABLE.exec(text)?.[1] ?? '(unnamed)';
}

export function wrapDbWithAuditGuard(db) {
  // null when no transaction is open.
  let txn = null;

  const classify = (sql) => {
    const table = mutatedTable(sql);
    if (table === null || txn === null) return;
    if (table === AUDIT_TABLE) txn.audited = true;
    else txn.changed.add(table);
  };

  const onTransactionKeyword = (sql) => {
    const word = TXN.exec(lead(sql))?.[1]?.toUpperCase();
    if (word === 'BEGIN') {
      // Nothing in this codebase nests transactions. Somebody who starts will
      // find out here rather than from a half-committed row later.
      if (txn !== null) throw new Error('AUDIT_GUARD: nested BEGIN');
      txn = { audited: false, changed: new Set() };
      return;
    }
    if (word === 'COMMIT' || word === 'END') {
      if (txn !== null && txn.changed.size > 0 && !txn.audited) {
        const tables = [...txn.changed].sort().join(', ');
        // Thrown BEFORE the COMMIT reaches the database, so the caller's
        // catch/ROLLBACK frame undoes the change. An unaudited mutation does
        // not get to land and then be complained about.
        txn = null;
        throw new Error(
          `AUDIT_GUARD: mutation of ${tables} committed without an ${AUDIT_TABLE} insert`,
        );
      }
      txn = null;
      return;
    }
    if (word === 'ROLLBACK') txn = null;
  };

  return {
    exec(sql) {
      onTransactionKeyword(sql);
      classify(sql);
      return db.exec(sql);
    },

    prepare(sql) {
      const statement = db.prepare(sql);
      // node:sqlite statement methods are bound to native handles, so this
      // forwards rather than copying them onto a new object.
      return {
        get: (...args) => statement.get(...args),
        all: (...args) => statement.all(...args),
        run: (...args) => {
          classify(sql);
          return statement.run(...args);
        },
      };
    },

    close: () => db.close(),

    // Test seam: what the guard believes right now.
    _txn: () => (txn === null ? null : { audited: txn.audited, changed: [...txn.changed] }),
  };
}

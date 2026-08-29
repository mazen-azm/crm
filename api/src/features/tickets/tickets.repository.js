// The only file in this feature with SQL, which verify-architecture enforces.
const PROJECTION = `
  id, customer_id, category_id, assignee_id, status, priority,
  subject, body, revision, created_at, updated_at
`;

export function insertTicket(db, { id, customerId, categoryId, subject, body, priority, status, at }) {
  // revision is not set here. The column defaults to 1 (0007__tickets_revision.sql)
  // and the row is read back afterwards, which is what picks it up.
  return db
    .prepare(`
      INSERT INTO tickets (id, customer_id, category_id, status, priority, subject, body, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(id, customerId, categoryId, status, priority, subject, body, at, at);
}

export function findTicketById(db, { id }) {
  return db
    .prepare(`SELECT ${PROJECTION} FROM tickets WHERE id = ? AND deleted_at IS NULL`)
    .get(id);
}

// This feature reads the customers table itself rather than importing the
// customers repository, which verify-architecture refuses — a feature reaches
// another only through its index.js, and customers/index.js publishes a router
// and a service, not this. Widening that surface for one caller would be the
// worse trade; the two features are already joined at the schema by
// tickets.customer_id REFERENCES customers(id). The rule is about imports, not
// about which table a query names.
export function findLiveCustomerId(db, { customerId }) {
  return db
    .prepare('SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL')
    .get(customerId);
}

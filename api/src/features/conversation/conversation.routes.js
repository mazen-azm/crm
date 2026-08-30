import express from 'express';

import { requireSubject } from '../../platform/http/permission.js';

// req and res stop here. The service takes values and returns values.
export function conversationRouter({ conversation }) {
  const router = express.Router();

  // requireSubject, not requireStaff, and the refusal is the service's.
  //
  // Every route under /tickets/:id answers a customer the same 404 a missing
  // ticket gets — that is the ownership rule, and a 403 at the door would be a
  // second, different answer to "is this ticket mine". The census that reads
  // these routes off the router is what holds it.
  //
  // A customer replying on their own ticket is CONVERSATION-3-API: a different
  // rule with a different effect, since their reply reopens a resolved ticket
  // and stops no clock. Until then this refuses them, the way assign and
  // status do, and that story turns the refusal into a comparison the way
  // CUSTOMERS-6-API did for the history.
  //
  // 201 with the message it made, the way every other create here answers: the
  // screen appends it rather than re-reading the thread.
  router.post('/tickets/:id/replies', requireSubject(), (req, res) => {
    res.status(201).json(
      conversation.reply(req.subject, { ticketId: req.params.id, body: req.body?.body }),
    );
  });

  return router;
}

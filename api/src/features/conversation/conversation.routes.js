import express from 'express';

import { requireSubject } from '../../platform/http/permission.js';
import { readPagination } from '../../platform/http/pagination.js';

// req and res stop here. The service takes values and returns values.
export function conversationRouter({ conversation }) {
  const router = express.Router();

  // requireSubject, and the ownership refusal is the service's: every route
  // under /tickets/:id answers a customer the same 404 a missing ticket gets,
  // and a 403 at the door would be a second, different answer to "is this
  // ticket mine".
  //
  // ONE route for a public reply, whoever writes it. This refused customers
  // while CONVERSATION-3-API was unwritten, and its comment said that story
  // would turn the refusal into a comparison. It did — in the service, where
  // what a reply DOES depends on who wrote it: the desk's answer stops the
  // clock and opens the ticket, and the customer's reopens a resolved one.
  // Posting a public message is one act, and two routes would be two write
  // paths for it.
  //
  // 201 with the message it made, the way every other create here answers: the
  // screen appends it rather than re-reading the thread.
  router.post('/tickets/:id/replies', requireSubject(), (req, res) => {
    res.status(201).json(
      conversation.reply(req.subject, { ticketId: req.params.id, body: req.body?.body, kind: req.body?.kind }),
    );
  });

  // The thread. requireSubject and not requireStaff, for the reason the reply
  // route gives: everything under /tickets/:id answers a customer the same 404
  // a missing ticket gets, and the service decides which.
  //
  // No route reads one message by id, and none is added here. The criterion
  // about asking for a note by id is conditional — "by any route that takes a
  // message id" — and nothing needs one. Adding a route to satisfy a criterion
  // about routes would be inventing the surface the rule is about; the census
  // covers any that arrives later.
  router.get('/tickets/:id/messages', requireSubject(), (req, res) => {
    res.json(
      conversation.thread(req.subject, { ticketId: req.params.id, ...readPagination(req) }),
    );
  });

  return router;
}

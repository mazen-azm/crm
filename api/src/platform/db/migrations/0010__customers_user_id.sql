-- I-1: users and customers are two tables, and this is the one column that
-- joins them. Null until the customer is granted a sign-in — which is the rule
-- stated as a schema fact rather than as a convention somebody remembers.
--
-- Nullable, because most customers never get one: somebody who telephones the
-- desk is a customer and will never sign in to anything.
ALTER TABLE customers ADD COLUMN user_id TEXT REFERENCES users(id);

-- Partial, so the many nulls do not collide with each other. One user account
-- belongs to at most one customer: without this, a second grant pointing at an
-- existing user would make "who is this person" a question with two answers,
-- and the ticket ownership check reads exactly that link.
CREATE UNIQUE INDEX customers_user_id_uq ON customers(user_id) WHERE user_id IS NOT NULL;

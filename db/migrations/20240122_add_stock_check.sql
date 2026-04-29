-- Add a non-negative stock invariant to the products table.
-- The application already validates stock at the route layer, but
-- under concurrent writes the read-then-write pattern can let two
-- requests both pass the in-process check and decrement past zero.
-- The DB-level CHECK is the backstop that surfaces the race.

ALTER TABLE products
  ADD CONSTRAINT stock_must_be_non_negative
  CHECK (stock >= 0);

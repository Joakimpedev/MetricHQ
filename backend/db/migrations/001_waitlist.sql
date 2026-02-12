-- Phase 2 Week 5: Waitlist table (run if schema was applied before this was added)
CREATE TABLE IF NOT EXISTS waitlist (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

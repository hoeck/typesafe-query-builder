DROP DATABASE IF EXISTS test_schema;

CREATE DATABASE test_schema;

\connect test_schema;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL
);

INSERT INTO users
  (id, name, email)
VALUES
  (1, 'user-a', 'a@user'),
  (2, 'user-c', 'c@user'),
  (3, 'user-b', 'b@user');

CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  active BOOLEAN NOT NULL
);

INSERT INTO items
  (id, label, user_id, active)
VALUES
  (1, 'item-1', 1, true),
  (2, 'item-2', 1, true),
  (3, 'item-3', 2, true),
  (4, 'item-4', 2, false),
  (5, 'item-5', 2, false);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

INSERT INTO events
  (item_id, type, timestamp)
VALUES
  (1, 'A', 0),
  (1, 'C', 10),
  (1, 'A', 20),
  (1, 'B', 30),
  (2, 'A', 10),
  (3, 'A', 10),
  (4, 'A', 10),
  (4, 'B', 50),
  (4, 'C', 80),
  (5, 'A', 10);

CREATE TABLE event_types (
  type TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL
);

INSERT INTO event_types
  (type, description, active)
VALUES
  ('A', 'Type A', true),
  ('B', 'Type B', true),
  ('C', 'Type C', true),
  ('X', 'Type X', false);

CREATE TABLE empty_table (
  id SERIAL PRIMARY KEY,
  value TEXT NOT NULL,
  active BOOLEAN NOT NULL
);

DROP DATABASE IF EXISTS test_schema;

CREATE DATABASE test_schema;

\connect test_schema;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  active BOOLEAN NOT NULL
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL
);

CREATE TABLE event_types (
  type TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL
);

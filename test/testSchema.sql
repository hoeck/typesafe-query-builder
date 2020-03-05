DROP DATABASE IF EXISTS test_schema;

CREATE DATABASE test_schema;

\connect test_schema;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT
);

INSERT INTO users
  (id, name, email, avatar)
VALUES
  (1, 'user-a', 'a@user', NULL),
  (2, 'user-c', 'c@user', NULL),
  (3, 'user-b', 'b@user', 'image.png');

SELECT pg_catalog.setval('users_id_seq', 4, false);

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
  timestamp TIMESTAMPTZ NOT NULL,
  payload JSON
);

INSERT INTO events
  (item_id, type, timestamp, payload)
VALUES
  (1, 'A', '2016-01-12 19:20:00', null),
  (1, 'C', '2016-03-01 17:30:00', null),
  (1, 'A', '2017-02-12 12:00:00', null),
  (1, 'B', '2017-06-12 15:20:00', null),
  (4, 'A', '2018-07-12 15:20:00', null),
  (4, 'B', '2018-08-12 01:50:00', '{"data": "asdf"}'),
  (4, 'C', '2019-01-12 19:50:00', null),
  (5, 'A', '2020-11-08 22:45:00', null),
  (5, 'B', '2022-10-05 09:20:00', null);

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

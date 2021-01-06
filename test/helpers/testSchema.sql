DROP DATABASE IF EXISTS test_schema;

CREATE DATABASE test_schema;

\connect test_schema;

-- an empty table

CREATE TABLE empty_table (
  id SERIAL PRIMARY KEY,
  value TEXT NOT NULL,
  active BOOLEAN NOT NULL
);

-- a json table

CREATE TABLE json_any_table (
  id SERIAL PRIMARY KEY,
  value JSON
);


--
-- Classic Console Games Inventory:
-- Manufacturers 1-* Systems 1-* Games *-1 Franchises
--

CREATE SCHEMA classicgames;

CREATE TABLE classicgames.manufacturers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL
);

INSERT INTO classicgames.manufacturers
  (id, name, country)
VALUES
  (1, 'Sega', 'Japan'),
  (2, 'Nintendo', 'Japan'),
  (3, 'Atari', 'USA');

SELECT pg_catalog.setval('classicgames.manufacturers_id_seq', 4, false);

CREATE TABLE classicgames.systems (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  year INT,
  manufacturer_id INT NOT NULL,
  FOREIGN KEY (manufacturer_id) REFERENCES classicgames.manufacturers(id)
);

INSERT INTO classicgames.systems
  (id, name, year, manufacturer_id)
VALUES
  (1, 'Master System', 1985, 1),
  (2, 'Genesis', 1988, 1),
  (3, 'Game Gear', 1990, 1),
  (4, 'NES', 1983, 2),
  (5, 'SNES', 1990, 2),
  (6, 'Game Boy', 1989, 2),
  (7, 'Atari 2600', 1977, 3);

SELECT pg_catalog.setval('classicgames.systems_id_seq', 8, false);

CREATE TABLE classicgames.franchises (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  manufacturer_id INT,
  FOREIGN KEY (manufacturer_id) REFERENCES classicgames.manufacturers(id)
);

INSERT INTO classicgames.franchises
  (id, name, manufacturer_id)
VALUES
  (1, 'Ultima', NULL),
  (2, 'Sonic', 1),
  (3, 'Mario', 2);

SELECT pg_catalog.setval('classicgames.franchises_id_seq', 4, false);

CREATE TABLE classicgames.games (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  urls JSON,
  franchise_id INT,
  FOREIGN KEY (franchise_id) REFERENCES classicgames.franchises(id)
);

INSERT INTO classicgames.games
  (id, title, franchise_id, urls)
VALUES
  (1, 'Sonic the Hedgehog', 2, NULL),
  (2, 'Super Mario Land', 3, NULL),
  (3, 'Super Mario Bros', 3, '{"wiki": "https://de.wikipedia.org/wiki/Sonic_the_Hedgehog_(1991)", "misc": "https://www.sega.com/games/sonic-hedgehog"}'),
  (4, 'Ultima IV', 1, '{"wiki": "https://en.wikipedia.org/wiki/Ultima_IV:_Quest_of_the_Avatar"}'),
  (5, 'Virtua Racing', NULL, '{"wiki":"https://en.wikipedia.org/wiki/Virtua_Racing","ign":"https://www.ign.com/games/virtua-racing"}'),
  (6, 'Laser Blast', NULL, '{"wiki": "https://en.wikipedia.org/wiki/Laser_Blast"}');

SELECT pg_catalog.setval('classicgames.games_id_seq', 7, false);

CREATE TABLE classicgames.games_systems (
  game_id INT NOT NULL,
  system_id INT NOT NULL,
  release_date TIMESTAMPTZ,
  played BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (game_id, system_id),
  FOREIGN KEY (game_id) REFERENCES classicgames.games(id),
  FOREIGN KEY (system_id) REFERENCES classicgames.systems(id)
);

INSERT INTO classicgames.games_systems
  (game_id, system_id, release_date, played)
VALUES
  -- sonic
  (1, 1, '1991-10-25', true), -- sms
  (1, 2, '1991-07-26', true), -- genesis
  (1, 3, '1991-12-28', true), -- gg
  -- mario land
  (2, 6, '1989-04-21', true), -- gb
  -- mario bros
  (3, 4, '1983-07-14', false), -- nes
  -- ultima iv
  (4, 1, '1990-01-01', true), -- sms
  (4, 4, '1990-01-01', false), -- nes
  -- virtua racing
  (5, 2, '1994-08-18', true), -- genesis
  -- laser blast
  (6, 7, '1981-03-01', true); -- 2600

--
-- An abstract schema of users, items, events:
-- Users 1-* Items 1-* Events *-1 EventTypes
--

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT,
  active TIMESTAMPTZ
);

INSERT INTO users
  (id, name, email, avatar, active)
VALUES
  (1, 'user-a', 'a@user', NULL, NULL),
  (2, 'user-c', 'c@user', NULL, NULL),
  (3, 'user-b', 'b@user', 'image.png', '2016-01-16 10:00:00Z');

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

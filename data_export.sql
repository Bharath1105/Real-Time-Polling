-- Data export from SQLite to PostgreSQL
-- Generated on 2025-09-14T17:22:45.880Z

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Insert users
INSERT INTO users (id, name, email, "passwordHash", "createdAt", "updatedAt") VALUES ('cmfjjqpql000073jcs30lcipa', 'abc', 'abc@gmail.com', '$2b$10$TxFuGQxGbiW7op15hI1BG.BjFYbkV4kASNZzqRkytEiycCkoHw9pK', '2025-09-14T10:22:41.614Z', '2025-09-14T10:22:41.614Z');
INSERT INTO users (id, name, email, "passwordHash", "createdAt", "updatedAt") VALUES ('cmfjlf3hb0000730oh47gfeqv', 'mani', 'mani@gmail.com', '$2b$10$8GrrO553hcs4fonTFkkYpOG1wSibA1DJCqgVUBfjb2p5FS9Srz6tW', '2025-09-14T11:09:38.784Z', '2025-09-14T11:09:38.784Z');

-- Insert polls
INSERT INTO polls (id, question, "isPublished", "createdAt", "updatedAt", "creatorId") VALUES ('cmfjjtfv8000273jcmj10acec', 'What is the maximum term of the Lok Sabha in India?', false, '2025-09-14T10:24:48.755Z', '2025-09-14T10:24:48.755Z', 'cmfjjqpql000073jcs30lcipa');
INSERT INTO polls (id, question, "isPublished", "createdAt", "updatedAt", "creatorId") VALUES ('cmfjjufei000673jchc8mu45f', 'How many seats are there in the Lok Sabha?', true, '2025-09-14T10:25:34.842Z', '2025-09-14T10:25:34.960Z', 'cmfjjqpql000073jcs30lcipa');
INSERT INTO polls (id, question, "isPublished", "createdAt", "updatedAt", "creatorId") VALUES ('cmfjlg09g0002730oz2umn1n6', 'who are you?', true, '2025-09-14T11:10:21.268Z', '2025-09-14T11:10:21.392Z', 'cmfjlf3hb0000730oh47gfeqv');
INSERT INTO polls (id, question, "isPublished", "createdAt", "updatedAt", "creatorId") VALUES ('cmfjlgr9l0007730okku4em61', 'languages known?', false, '2025-09-14T11:10:56.265Z', '2025-09-14T11:10:56.265Z', 'cmfjlf3hb0000730oh47gfeqv');

-- Insert poll options
INSERT INTO poll_options (id, text, "createdAt", "pollId") VALUES ('cmfjjtfv8000373jct4ge4f3f', '4 years', '2025-09-14T10:24:48.755Z', 'cmfjjtfv8000273jcmj10acec');
INSERT INTO poll_options (id, text, "createdAt", "pollId") VALUES ('cmfjjtfv8000473jcbbp3jg9v', '5 years', '2025-09-14T10:24:48.755Z', 'cmfjjtfv8000273jcmj10acec');
INSERT INTO poll_options (id, text, "createdAt", "pollId") VALUES ('cmfjjufei000773jc42v61sj7', '345', '2025-09-14T10:25:34.842Z', 'cmfjjufei000673jchc8mu45f');
INSERT INTO poll_options (id, text, "createdAt", "pollId") VALUES ('cmfjjufei000873jc3kcctsmi', '545', '2025-09-14T10:25:34.842Z', 'cmfjjufei000673jchc8mu45f');
INSERT INTO poll_options (id, text, "createdAt", "pollId") VALUES ('cmfjlg09g0003730odwwkfd80', 'human', '2025-09-14T11:10:21.268Z', 'cmfjlg09g0002730oz2umn1n6');
INSERT INTO poll_options (id, text, "createdAt", "pollId") VALUES ('cmfjlg09g0004730of30pnk5t', 'robot', '2025-09-14T11:10:21.268Z', 'cmfjlg09g0002730oz2umn1n6');
INSERT INTO poll_options (id, text, "createdAt", "pollId") VALUES ('cmfjlg09g0005730o7xh5ca4m', 'animal', '2025-09-14T11:10:21.268Z', 'cmfjlg09g0002730oz2umn1n6');
INSERT INTO poll_options (id, text, "createdAt", "pollId") VALUES ('cmfjlgr9l0008730orspqhbc1', 'hindi', '2025-09-14T11:10:56.265Z', 'cmfjlgr9l0007730okku4em61');
INSERT INTO poll_options (id, text, "createdAt", "pollId") VALUES ('cmfjlgr9l0009730ok8w7rbot', 'kannada', '2025-09-14T11:10:56.265Z', 'cmfjlgr9l0007730okku4em61');
INSERT INTO poll_options (id, text, "createdAt", "pollId") VALUES ('cmfjlgr9l000a730ocyuovgva', 'both', '2025-09-14T11:10:56.265Z', 'cmfjlgr9l0007730okku4em61');

-- Insert votes
INSERT INTO votes (id, "createdAt", "userId", "pollOptionId") VALUES ('cmfjjur14000a73jc1hhp9lta', '2025-09-14T10:25:49.912Z', 'cmfjjqpql000073jcs30lcipa', 'cmfjjufei000873jc3kcctsmi');
INSERT INTO votes (id, "createdAt", "userId", "pollOptionId") VALUES ('cmfjliv8f000c730oe9d3gcok', '2025-09-14T11:12:34.719Z', 'cmfjjqpql000073jcs30lcipa', 'cmfjlg09g0003730odwwkfd80');
INSERT INTO votes (id, "createdAt", "userId", "pollOptionId") VALUES ('cmfjljara000e730oh53cz8qt', '2025-09-14T11:12:54.838Z', 'cmfjjqpql000073jcs30lcipa', 'cmfjlg09g0004730of30pnk5t');

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

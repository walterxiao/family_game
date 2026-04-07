CREATE DATABASE IF NOT EXISTS familygame;
USE familygame;

-- ── Rooms ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  room_code   CHAR(4)       NOT NULL PRIMARY KEY,
  host_socket VARCHAR(64),
  status      ENUM('lobby','playing','complete') NOT NULL DEFAULT 'lobby',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Players ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id          INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_code   CHAR(4)       NOT NULL,
  socket_id   VARCHAR(64)   NOT NULL,
  name        VARCHAR(64)   NOT NULL,
  age         TINYINT       NOT NULL DEFAULT 10,
  role        ENUM('host','player') NOT NULL DEFAULT 'player',
  status      ENUM('active','disconnected') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room_code (room_code),
  INDEX idx_socket_id (socket_id)
);

-- ── Games ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
  id                INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_code         CHAR(4)       NOT NULL UNIQUE,
  status            ENUM('active','complete') DEFAULT 'active',
  current_turn      INT           DEFAULT 0,
  tile_bag          TEXT          NOT NULL,          -- JSON array of remaining letters
  board_state       MEDIUMTEXT    NOT NULL,          -- JSON sparse map "row,col"→{letter,value,...}
  consecutive_passes TINYINT      DEFAULT 0,
  started_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at          TIMESTAMP     NULL,
  INDEX idx_room_code (room_code)
);

-- ── Game Players ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_players (
  id            INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  game_id       INT           NOT NULL,
  player_id     INT           NOT NULL,
  turn_position TINYINT       NOT NULL,
  tile_rack     VARCHAR(64)   DEFAULT '[]',          -- JSON: ["A","B",...]
  score         INT           DEFAULT 0,
  INDEX idx_game_id (game_id),
  INDEX idx_player_id (player_id)
);

-- ── Moves ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moves (
  id           INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  game_id      INT           NOT NULL,
  player_id    INT           NOT NULL,
  move_type    ENUM('play','pass','exchange') NOT NULL,
  placements   TEXT          NULL,                   -- JSON [{row,col,letter,value},...]
  words_formed TEXT          NULL,                   -- JSON ["WORD1","WORD2"]
  score        INT           DEFAULT 0,
  move_number  SMALLINT      NOT NULL,
  played_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_game_id (game_id),
  INDEX idx_player_id (player_id)
);

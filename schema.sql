CREATE DATABASE IF NOT EXISTS familygame;
USE familygame;

CREATE TABLE IF NOT EXISTS rooms (
  room_code     CHAR(4)       NOT NULL PRIMARY KEY,
  host_socket   VARCHAR(64),
  status        ENUM('lobby','puzzle','final','results','complete') NOT NULL DEFAULT 'lobby',
  total_rounds  TINYINT       NOT NULL DEFAULT 4,
  current_round TINYINT       NOT NULL DEFAULT 0,
  hints_allowed TINYINT       NOT NULL DEFAULT 3,
  hints_used    TINYINT       NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  id          INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_code   CHAR(4)       NOT NULL,
  socket_id   VARCHAR(64)   NOT NULL,
  name        VARCHAR(64)   NOT NULL,
  age         TINYINT       NOT NULL,
  tier        TINYINT       NOT NULL,
  role        ENUM('host','player') NOT NULL DEFAULT 'player',
  status      ENUM('waiting','solving','solved','disconnected') NOT NULL DEFAULT 'waiting',
  score       INT           NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room_code (room_code),
  INDEX idx_socket_id (socket_id)
);

CREATE TABLE IF NOT EXISTS rounds (
  id            INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_code     CHAR(4)       NOT NULL,
  round_index   TINYINT       NOT NULL,
  theme         VARCHAR(64)   NOT NULL,
  status        ENUM('pending','active','complete') NOT NULL DEFAULT 'pending',
  started_at    TIMESTAMP     NULL,
  completed_at  TIMESTAMP     NULL,
  INDEX idx_room_code (room_code)
);

CREATE TABLE IF NOT EXISTS round_players (
  id          INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  round_id    INT           NOT NULL,
  player_id   INT           NOT NULL,
  puzzle_id   VARCHAR(64)   NOT NULL,
  fragment    VARCHAR(128)  NOT NULL,
  solved_at   TIMESTAMP     NULL,
  INDEX idx_round_id (round_id),
  INDEX idx_player_id (player_id)
);

CREATE TABLE IF NOT EXISTS final_puzzles (
  round_id              INT           NOT NULL PRIMARY KEY,
  prompt                TEXT          NOT NULL,
  normalized_answer     VARCHAR(256)  NOT NULL,
  answered_by_player    INT           NULL,
  answered_at           TIMESTAMP     NULL
);

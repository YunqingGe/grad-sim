-- 读研模拟器排行榜：每个浏览器（设备编号）一行，同时记它的最高分和最低分
-- 在 Cloudflare 后台 D1 数据库的 Console 里整段粘贴运行一次即可
CREATE TABLE IF NOT EXISTS players (
  dev       TEXT PRIMARY KEY,
  runs      INTEGER NOT NULL DEFAULT 1,
  updated   INTEGER NOT NULL,
  hi        INTEGER NOT NULL,
  hi_name   TEXT NOT NULL,
  hi_sex    TEXT NOT NULL,
  hi_mentor TEXT NOT NULL,
  hi_end    TEXT NOT NULL,
  hi_at     INTEGER NOT NULL,
  lo        INTEGER NOT NULL,
  lo_name   TEXT NOT NULL,
  lo_sex    TEXT NOT NULL,
  lo_mentor TEXT NOT NULL,
  lo_end    TEXT NOT NULL,
  lo_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS players_hi ON players (hi DESC, hi_at);
CREATE INDEX IF NOT EXISTS players_lo ON players (lo, lo_at);

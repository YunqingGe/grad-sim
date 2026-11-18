/**
 * 读研模拟器排行榜接口（Cloudflare Pages Functions + D1 数据库）
 *
 *   GET    /api/board?dev=设备编号   高分榜、低分榜各前 20 名，以及自己的名次
 *   POST   /api/submit              提交一局的盲审成绩 {dev, name, sex, score, mentor, end}
 *   DELETE /api/me?dev=设备编号      退出排行榜，删掉自己的记录
 *
 * 每个设备编号（一个浏览器）在表里只有一行，同时记着它打出过的最高分和最低分：
 * 新成绩比最高分高就替换最高分那一条，比最低分低就替换最低分那一条，分数相同时保留先打出来的。
 * 数据库在 Cloudflare 后台绑定，变量名 DB；建表语句见 migrations/0001_rank.sql。
 */

const TOP = 20;
const ENDS = ["dead", "quit", "rest", "fail", "bigco", "job", "home", "phdcn", "phdab", "stay"];
const HEAD = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: HEAD });
const okDev = (d) => typeof d === "string" && /^[a-z0-9]{6,40}$/.test(d);

// 去掉控制字符和会打乱文字方向的隐形字符，按字（不是字节）截断
function clean(s, max, dflt) {
  const t = Array.from(
    String(s == null ? "" : s)
      .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, "")
      .trim(),
  )
    .slice(0, max)
    .join("");
  return t || dflt;
}

export async function onRequest({ request, env, params }) {
  const route = [].concat(params.route || []).join("/");
  const url = new URL(request.url);
  const method = request.method;
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: HEAD });
  if (!env.DB) return json({ error: "排行榜数据库还没有绑定" }, 503);
  try {
    if (route === "board" && method === "GET") return await board(env.DB, url.searchParams.get("dev"));
    if (route === "submit" && method === "POST") return await submit(env.DB, await request.json().catch(() => null));
    if (route === "me" && method === "DELETE") return await remove(env.DB, url.searchParams.get("dev"));
  } catch (e) {
    return json({ error: "服务器出错了" }, 500);
  }
  return json({ error: "没有这个接口" }, 404);
}

async function submit(db, b) {
  if (!b || !okDev(b.dev)) return json({ error: "设备编号不对" }, 400);
  const score = Number(b.score);
  if (!Number.isInteger(score) || score < 0 || score > 100) return json({ error: "分数不对" }, 400);
  const row = [
    b.dev,
    Date.now(),
    score,
    clean(b.name, 12, "无名研究生"),
    b.sex === "b" ? "b" : "g",
    clean(b.mentor, 20, ""),
    ENDS.indexOf(b.end) >= 0 ? b.end : "",
  ];
  // SQLite 的 UPDATE 里，等号右边读到的都是更新前的旧值，所以 hi 和 hi_name 等可以放在同一句里比较
  await db
    .prepare(
      `INSERT INTO players (dev, runs, updated,
         hi, hi_name, hi_sex, hi_mentor, hi_end, hi_at,
         lo, lo_name, lo_sex, lo_mentor, lo_end, lo_at)
       VALUES (?1, 1, ?2, ?3, ?4, ?5, ?6, ?7, ?2, ?3, ?4, ?5, ?6, ?7, ?2)
       ON CONFLICT(dev) DO UPDATE SET
         runs = players.runs + 1,
         updated = excluded.updated,
         hi_name   = CASE WHEN excluded.hi > players.hi THEN excluded.hi_name   ELSE players.hi_name   END,
         hi_sex    = CASE WHEN excluded.hi > players.hi THEN excluded.hi_sex    ELSE players.hi_sex    END,
         hi_mentor = CASE WHEN excluded.hi > players.hi THEN excluded.hi_mentor ELSE players.hi_mentor END,
         hi_end    = CASE WHEN excluded.hi > players.hi THEN excluded.hi_end    ELSE players.hi_end    END,
         hi_at     = CASE WHEN excluded.hi > players.hi THEN excluded.hi_at     ELSE players.hi_at     END,
         hi        = MAX(players.hi, excluded.hi),
         lo_name   = CASE WHEN excluded.lo < players.lo THEN excluded.lo_name   ELSE players.lo_name   END,
         lo_sex    = CASE WHEN excluded.lo < players.lo THEN excluded.lo_sex    ELSE players.lo_sex    END,
         lo_mentor = CASE WHEN excluded.lo < players.lo THEN excluded.lo_mentor ELSE players.lo_mentor END,
         lo_end    = CASE WHEN excluded.lo < players.lo THEN excluded.lo_end    ELSE players.lo_end    END,
         lo_at     = CASE WHEN excluded.lo < players.lo THEN excluded.lo_at     ELSE players.lo_at     END,
         lo        = MIN(players.lo, excluded.lo)`,
    )
    .bind(...row)
    .run();
  return json({ ok: true });
}

async function board(db, dev) {
  const d = okDev(dev) ? dev : "";
  const list = (side, order) =>
    db
      .prepare(
        `SELECT ${side}_name AS name, ${side}_sex AS sex, ${side} AS score,
                ${side}_mentor AS mentor, ${side}_end AS end, dev = ?1 AS me
         FROM players ORDER BY ${side} ${order}, ${side}_at ASC LIMIT ${TOP}`,
      )
      .bind(d);
  const [hi, lo, me, total] = await db.batch([
    list("hi", "DESC"),
    list("lo", "ASC"),
    db
      .prepare(
        `SELECT hi, lo,
                (SELECT COUNT(*) FROM players q WHERE q.hi > p.hi) + 1 AS hiRank,
                (SELECT COUNT(*) FROM players q WHERE q.lo < p.lo) + 1 AS loRank
         FROM players p WHERE dev = ?1`,
      )
      .bind(d),
    db.prepare("SELECT COUNT(*) AS n FROM players"),
  ]);
  const fix = (r) => ({ ...r, me: !!r.me });
  return json({
    hi: hi.results.map(fix),
    lo: lo.results.map(fix),
    me: me.results[0] || null,
    total: total.results[0].n,
  });
}

async function remove(db, dev) {
  if (!okDev(dev)) return json({ error: "设备编号不对" }, 400);
  await db.prepare("DELETE FROM players WHERE dev = ?1").bind(dev).run();
  return json({ ok: true });
}

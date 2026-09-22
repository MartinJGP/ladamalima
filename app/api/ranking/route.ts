import { env } from "cloudflare:workers";

export const runtime = "edge";

const schema = `CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  levels INTEGER NOT NULL,
  time INTEGER NOT NULL,
  created_at TEXT NOT NULL
)`;

const headers = { "cache-control": "no-store, max-age=0" };

async function ensureTable() {
  await env.DB.prepare(schema).run();
}

export async function GET() {
  await ensureTable();
  const result = await env.DB.prepare(
    "SELECT name, score, levels, time, created_at AS date FROM leaderboard ORDER BY score DESC, levels DESC, time ASC, created_at ASC LIMIT 20"
  ).all();
  return Response.json({ ranking: result.results ?? [] }, { headers });
}

export async function POST(request: Request) {
  let input: Record<string, unknown>;
  try { input = await request.json(); }
  catch { return Response.json({ error: "JSON inválido" }, { status: 400, headers }); }

  const name = String(input.name ?? "").trim().replace(/\s+/g, " ").slice(0, 18);
  const score = Number(input.score);
  const levels = Number(input.levels);
  const time = Number(input.time);
  if (!name || !Number.isInteger(score) || score < 0 || score > 10000000 || !Number.isInteger(levels) || levels < 1 || levels > 3 || !Number.isInteger(time) || time < 0 || time > 86400) {
    return Response.json({ error: "Puntuación inválida" }, { status: 400, headers });
  }

  await ensureTable();
  await env.DB.prepare(
    "INSERT INTO leaderboard (name, score, levels, time, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(name, score, levels, time, new Date().toISOString()).run();
  await env.DB.prepare(
    "DELETE FROM leaderboard WHERE id NOT IN (SELECT id FROM leaderboard ORDER BY score DESC, levels DESC, time ASC, created_at ASC LIMIT 200)"
  ).run();
  return Response.json({ ok: true }, { status: 201, headers });
}

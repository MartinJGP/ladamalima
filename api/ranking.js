import { neon } from "@neondatabase/serverless";

const responseHeaders = { "cache-control": "no-store, max-age=0" };

function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está configurada");
  return neon(process.env.DATABASE_URL);
}

async function ensureTable(sql) {
  await sql`CREATE TABLE IF NOT EXISTS leaderboard (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(18) NOT NULL,
    score INTEGER NOT NULL,
    levels SMALLINT NOT NULL,
    time INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function GET() {
  try {
    const sql = database();
    await ensureTable(sql);
    const ranking = await sql`SELECT name, score, levels, time, created_at AS date
      FROM leaderboard
      ORDER BY score DESC, levels DESC, time ASC, created_at ASC
      LIMIT 20`;
    return Response.json({ ranking }, { headers: responseHeaders });
  } catch (error) {
    console.error("ranking GET", error);
    return Response.json({ error: "Ranking no disponible" }, { status: 503, headers: responseHeaders });
  }
}

export async function POST(request) {
  let input;
  try { input = await request.json(); }
  catch { return Response.json({ error: "JSON inválido" }, { status: 400, headers: responseHeaders }); }

  const name = String(input?.name ?? "").trim().replace(/\s+/g, " ").slice(0, 18);
  const score = Number(input?.score);
  const levels = Number(input?.levels);
  const time = Number(input?.time);
  const valid = name && Number.isInteger(score) && score >= 0 && score <= 10000000
    && Number.isInteger(levels) && levels >= 1 && levels <= 3
    && Number.isInteger(time) && time >= 0 && time <= 86400;
  if (!valid) return Response.json({ error: "Puntuación inválida" }, { status: 400, headers: responseHeaders });

  try {
    const sql = database();
    await ensureTable(sql);
    await sql`INSERT INTO leaderboard (name, score, levels, time) VALUES (${name}, ${score}, ${levels}, ${time})`;
    await sql`DELETE FROM leaderboard WHERE id NOT IN (
      SELECT id FROM leaderboard ORDER BY score DESC, levels DESC, time ASC, created_at ASC LIMIT 200
    )`;
    return Response.json({ ok: true }, { status: 201, headers: responseHeaders });
  } catch (error) {
    console.error("ranking POST", error);
    return Response.json({ error: "No se pudo guardar la puntuación" }, { status: 503, headers: responseHeaders });
  }
}

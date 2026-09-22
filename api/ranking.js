import { neon } from "@neondatabase/serverless";

const responseHeaders = { "cache-control": "no-store, max-age=0" };

function connectionString() {
  return process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.NEON_DATABASE_URL
    || process.env.DATABASE_URL_UNPOOLED
    || "";
}

function database() {
  const url = connectionString();
  if (!url) {
    const error = new Error("No hay una variable de conexión configurada");
    error.code = "DATABASE_URL_MISSING";
    throw error;
  }
  return neon(url);
}

function unavailable(error, operation) {
  const code = error?.code === "DATABASE_URL_MISSING" ? "DATABASE_URL_MISSING" : "DATABASE_CONNECTION_FAILED";
  console.error(`ranking ${operation} [${code}]`, error);
  const message = code === "DATABASE_URL_MISSING"
    ? "Falta DATABASE_URL en el entorno de Producción de Vercel."
    : "No se pudo conectar con la base de datos del ranking.";
  return Response.json({ error: message, code, connected: false }, { status: 503, headers: responseHeaders });
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
    return Response.json({ ranking, connected: true, provider: "neon" }, { headers: responseHeaders });
  } catch (error) {
    return unavailable(error, "GET");
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
    && Number.isInteger(levels) && levels >= 1 && levels <= 12
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
    return unavailable(error, "POST");
  }
}

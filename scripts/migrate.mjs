// Run one or more .sql files against your Supabase Postgres (statement-by-statement,
// idempotent — "already exists" is skipped). Reads DATABASE_URL from .env.local.
//
//   npm run migrate     # schema only (safe to re-run on an existing DB)
//   npm run seed        # boilerplate wallets/categories (fresh install only)
//
// Pass file paths as args; defaults to the schema migration.
//
import { readFileSync } from "node:fs";
import { Client } from "pg";

function loadEnv(path) {
  const out = {};
  let raw = "";
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return out;
  }
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

// Split SQL into statements, respecting $$…$$ function bodies and -- line comments.
// Only split on a ; that is outside a dollar-quoted block.
function splitSql(sql) {
  const stmts = [];
  let buf = "";
  let inDollar = false;
  for (let i = 0; i < sql.length; ) {
    const two = sql.slice(i, i + 2);
    if (!inDollar && two === "--") {
      const j = sql.indexOf("\n", i);
      i = j === -1 ? sql.length : j;
      continue;
    }
    if (two === "$$") {
      inDollar = !inDollar;
      buf += "$$";
      i += 2;
      continue;
    }
    const ch = sql[i];
    if (ch === ";" && !inDollar) {
      stmts.push(buf);
      buf = "";
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  if (buf.trim()) stmts.push(buf);
  return stmts.map((s) => s.trim()).filter(Boolean);
}

const env = loadEnv(".env.local");
const dbUrl = env.DATABASE_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("✗ DATABASE_URL is missing. Set it in .env.local (Supabase → Settings → Database → Connection string → URI).");
  process.exit(1);
}

const args = process.argv.slice(2);
const FILES = args.length ? args : ["supabase/migrations/0001_init.sql"];
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const file of FILES) {
    const statements = splitSql(readFileSync(file, "utf8"));
    let applied = 0;
    for (const stmt of statements) {
      try {
        await client.query(stmt); // each statement auto-commits (no explicit transaction)
        applied++;
      } catch (e) {
        if (/already exists/i.test(e.message)) continue; // idempotent: skip duplicates
        console.error(`✗ Failed in ${file}:\n${stmt.slice(0, 200)}\n${e.message}`);
        throw e;
      }
    }
    console.log(`  ${file} — ${applied} statement(s) applied`);
  }
  console.log("✅ Done. Your data is untouched.");
} catch (e) {
  process.exitCode = 1;
} finally {
  await client.end();
}

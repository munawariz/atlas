#!/usr/bin/env node
// Atlas migration runner. Plain Node ESM, no framework.
//
//   node scripts/migrate.mjs supabase/migrations/0001_init.sql
//   node scripts/migrate.mjs supabase/seed.sql
//
// Statements run individually in auto-commit — no wrapping transaction — because
// `alter type ... add value` cannot run inside one. Errors matching /already exists/i are
// skipped so re-runs are clean.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DEFAULT_FILES = ["supabase/migrations/0001_init.sql"];

/** Minimal .env.local reader: KEY=value, strips quotes and trailing # comments. */
function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip a trailing comment only when the value is not quoted.
    if (!/^["']/.test(value)) {
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Split SQL into statements, respecting $$...$$ dollar-quoted function bodies and skipping
 * `--` line comments. A naive split on `;` corrupts the trigger functions.
 */
function splitStatements(sql) {
  const statements = [];
  let buf = "";
  let i = 0;
  let dollarTag = null; // e.g. "$$" or "$fn$" while inside a dollar-quoted body
  let inSingle = false;
  let inDouble = false;

  while (i < sql.length) {
    const ch = sql[i];
    const rest = sql.slice(i);

    if (dollarTag) {
      if (rest.startsWith(dollarTag)) {
        buf += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      buf += ch;
      i += 1;
      continue;
    }

    if (inSingle) {
      buf += ch;
      i += 1;
      if (ch === "'") inSingle = false;
      continue;
    }

    if (inDouble) {
      buf += ch;
      i += 1;
      if (ch === '"') inDouble = false;
      continue;
    }

    // Line comment — drop it entirely.
    if (rest.startsWith("--")) {
      const nl = sql.indexOf("\n", i);
      i = nl === -1 ? sql.length : nl + 1;
      buf += "\n";
      continue;
    }

    // Block comment.
    if (rest.startsWith("/*")) {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      buf += " ";
      continue;
    }

    // Opening dollar quote: $$ or $tag$
    const dollar = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(rest);
    if (dollar) {
      dollarTag = dollar[0];
      buf += dollarTag;
      i += dollarTag.length;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      buf += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      buf += ch;
      i += 1;
      continue;
    }

    if (ch === ";") {
      const statement = buf.trim();
      if (statement) statements.push(statement);
      buf = "";
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }

  const tail = buf.trim();
  if (tail) statements.push(tail);
  return statements;
}

async function main() {
  const env = { ...loadEnvLocal() };
  const connectionString = env.DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "DATABASE_URL is not set. Add it to .env.local (copy .example.env) or export it."
    );
    process.exit(1);
  }

  const files = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_FILES;

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    for (const file of files) {
      const path = resolve(process.cwd(), file);
      if (!existsSync(path)) {
        console.error(`✗ ${file} — not found`);
        process.exitCode = 1;
        continue;
      }
      const statements = splitStatements(readFileSync(path, "utf8"));
      let applied = 0;
      for (const statement of statements) {
        try {
          await client.query(statement);
          applied += 1;
        } catch (err) {
          if (/already exists/i.test(err.message)) continue;
          console.error(`\n✗ Failed in ${file}:\n${statement.slice(0, 400)}\n`);
          throw err;
        }
      }
      console.log(`${file} — ${applied} statement(s) applied`);
    }
    console.log("✅ Done. Your data is untouched.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

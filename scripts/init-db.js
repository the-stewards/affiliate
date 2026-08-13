// Run once after setting DATABASE_URL: `node scripts/init-db.js`
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Set DATABASE_URL first (see .env.example).");
  process.exit(1);
}

const sql = neon(connectionString);
const schema = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");

async function main() {
  // neon() serverless driver runs one statement at a time — split on ";"
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await sql(stmt);
    console.log("Ran:", stmt.slice(0, 60).replace(/\n/g, " ") + "...");
  }
  console.log("\nSchema applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

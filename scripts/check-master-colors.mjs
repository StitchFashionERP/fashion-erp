import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();

const result = await client.query(`
  select storage_value
  from shared_application_state
  where storage_key = 'stitch-master-data-v1'
`);

console.log("records:", result.rows.length);

if (result.rows.length) {
  const data = JSON.parse(
    result.rows[0].storage_value,
  );

  console.log(
    data.colorFamilies.map((c) => ({
      name: c.name,
      code: c.code,
    })),
  );
}

await client.end();

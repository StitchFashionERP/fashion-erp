import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();

await client.query(`
  update product_variants
  set color_code = '32'
  where color_code = 'DUBBEL'
`);

console.log("Productvarianten bijgewerkt naar Castagne Brown (32)");

const result = await client.query(`
  select storage_value
  from shared_application_state
  where storage_key = 'stitch-master-data-v1'
`);

const data = JSON.parse(
  result.rows[0].storage_value,
);

const before = data.colorFamilies.length;

data.colorFamilies = data.colorFamilies.filter(
  (color) =>
    color.name.toLowerCase() !== "castagne",
);

const after = data.colorFamilies.length;

await client.query(
  `
  update shared_application_state
  set storage_value = $1,
      updated_at = now()
  where storage_key = 'stitch-master-data-v1'
  `,
  [
    JSON.stringify(data),
  ],
);

console.log(
  `Castagne verwijderd: ${before - after}`,
);

await client.end();

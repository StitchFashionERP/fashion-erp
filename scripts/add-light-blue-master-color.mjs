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

if (!result.rows.length) {
  throw new Error("Master data niet gevonden.");
}

const data = JSON.parse(
  result.rows[0].storage_value,
);

const exists = data.colorFamilies.some(
  (color) =>
    color.name.toLowerCase() === "light blue",
);

if (!exists) {
  data.colorFamilies.push({
    id: "colorFamilies-light-blue",
    code: "82",
    name: "Light Blue",
    active: true,
    sortOrder: data.colorFamilies.length + 1,
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await client.query(
    `
    update shared_application_state
    set storage_value = $1,
        updated_at = now()
    where storage_key = 'stitch-master-data-v1'
    `,
    [JSON.stringify(data)],
  );

  console.log("Light Blue toegevoegd");
} else {
  console.log("Light Blue bestond al");
}

await client.end();

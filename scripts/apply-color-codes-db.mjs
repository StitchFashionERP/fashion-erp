import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

async function main() {
  await client.connect();

  const orgResult = await client.query(`
    select id, name
    from organizations
    limit 10
  `);

  console.log("Organizations:");
  console.log(orgResult.rows);

  if (orgResult.rows.length === 0) {
    throw new Error("Geen organisaties gevonden.");
  }

  const organizationId = orgResult.rows[0].id;

  const stateResult = await client.query(
    `
    select storage_key, storage_value
    from shared_application_state
    where organization_id = $1
      and storage_key = 'stitch-master-data-v1'
    `,
    [organizationId],
  );

  if (stateResult.rows.length === 0) {
    throw new Error("Master data niet gevonden.");
  }

  const masterData = JSON.parse(
    stateResult.rows[0].storage_value,
  );

  const colors = masterData.colorFamilies ?? [];

  console.log(
    colors.map((color) => ({
      name: color.name,
      code: color.code,
    })),
  );

  const colorAliases = {
    "soft rose": "soft pink",
    "old pink": "soft pink",
    "army": "army light green",
    "army green": "army light green",
    "militaire green": "miltaire green",
    "militaire green": "miltaire green",
    "light blue": "light blue",
    "off white": "white",
    "castagna": "castagne brown",
  };

  const colorMap = new Map(
    colors.map((color) => [
      normalize(color.name),
      color,
    ]),
  );

  for (const [alias, target] of Object.entries(colorAliases)) {
    const targetColor = colorMap.get(target);

    if (targetColor) {
      colorMap.set(alias, targetColor);
    }
  }

  const variantsResult = await client.query(
    `
    select id, sku, color, color_code
    from product_variants
    where organization_id = $1
    `,
    [organizationId],
  );

  const variants = variantsResult.rows;

  console.log("");
  console.log(
    "Varianten:",
    variants.length,
  );

  let matched = 0;
  let already = 0;
  let missing = 0;

  for (const variant of variants) {
    const masterColor = colorMap.get(
      normalize(variant.color),
    );

    if (!masterColor) {
      missing++;

      console.log(
        "ONTBREEKT:",
        variant.color,
        "|",
        variant.sku,
      );

      continue;
    }

    if (variant.color_code) {
      already++;
      continue;
    }

    matched++;

    await client.query(
      `
      update product_variants
      set color_code = $1
      where id = $2
        and color_code is null
      `,
      [
        masterColor.code,
        variant.id,
      ],
    );

    console.log(
      "UPDATED:",
      variant.color,
      "->",
      masterColor.code,
    );
  }

  console.log("");

  console.log({
    matched,
    already,
    missing,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    client.end();
  });

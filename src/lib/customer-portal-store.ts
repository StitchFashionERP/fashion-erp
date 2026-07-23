import "server-only";

import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type {
  CustomerPortalRecord,
  PublicPortalRecord,
} from "@/lib/customer-portal-types";

const dataDir = path.join(
  process.cwd(),
  ".stitch-data",
);
const dataFile = path.join(
  dataDir,
  "customer-portals.json",
);

async function readRecords() {
  try {
    const content = await readFile(
      dataFile,
      "utf8",
    );

    return JSON.parse(
      content,
    ) as CustomerPortalRecord[];
  } catch {
    return [] as CustomerPortalRecord[];
  }
}

async function writeRecords(
  records: CustomerPortalRecord[],
) {
  await mkdir(dataDir, {
    recursive: true,
  });

  await writeFile(
    dataFile,
    JSON.stringify(records, null, 2),
    "utf8",
  );
}

export function createPortalToken() {
  return randomBytes(24).toString("base64url");
}

export function createVerificationCode() {
  return String(
    randomInt(100000, 1000000),
  );
}

export function hashValue(value: string) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

export function verifyHash(
  value: string,
  expectedHash: string,
) {
  const actual = Buffer.from(
    hashValue(value),
    "hex",
  );
  const expected = Buffer.from(
    expectedHash,
    "hex",
  );

  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}

export async function savePortalRecord(
  record: CustomerPortalRecord,
) {
  const records = await readRecords();
  const next = [
    record,
    ...records.filter(
      (item) =>
        item.order.orderId !==
        record.order.orderId ||
        item.status === "Goedgekeurd",
    ),
  ];

  await writeRecords(next);
  return record;
}

export async function getPortalByToken(
  token: string,
) {
  const records = await readRecords();
  return (
    records.find(
      (item) => item.token === token,
    ) ?? null
  );
}

export async function updatePortal(
  token: string,
  updater: (
    record: CustomerPortalRecord,
  ) => CustomerPortalRecord,
) {
  const records = await readRecords();
  const index = records.findIndex(
    (item) => item.token === token,
  );

  if (index < 0) {
    return null;
  }

  records[index] = updater(records[index]);
  await writeRecords(records);
  return records[index];
}

export function toPublicPortal(
  record: CustomerPortalRecord,
  verified: boolean,
): PublicPortalRecord {
  const {
    verificationCodeHash: _code,
    pdfBase64: _pdf,
    ...publicRecord
  } = record;

  return {
    ...publicRecord,
    verified,
  };
}

export function isExpired(
  record: CustomerPortalRecord,
) {
  return (
    new Date(record.expiresAt).getTime() <
    Date.now()
  );
}

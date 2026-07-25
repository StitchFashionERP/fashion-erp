import { NextRequest, NextResponse } from "next/server";

type Json = Record<string, unknown>;
const record = (value: unknown): Json => (value && typeof value === "object" ? value as Json : {});
const text = (value: unknown) => typeof value === "string" ? value : "";
const list = (value: unknown) => Array.isArray(value) ? value : [];

function apiKey() {
  const value = process.env.KVK_API_KEY;
  if (!value) throw new Error("KVK_API_KEY ontbreekt in de omgevingsvariabelen.");
  return value;
}

async function kvk(path: string) {
  const response = await fetch(`https://api.kvk.nl/api${path}`, {
    headers: { apikey: apiKey(), Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const body = record(payload);
    throw new Error(text(body.detail) || text(body.title) || `KvK API gaf status ${response.status}.`);
  }
  return record(payload);
}

function mapSearchResult(value: unknown) {
  const item = record(value);
  const address = record(item.adres);
  return {
    kvkNumber: text(item.kvkNummer),
    branchNumber: text(item.vestigingsnummer),
    companyName: text(item.naam),
    tradeName: text(item.handelsnaam),
    street: text(address.straatnaam),
    houseNumber: [text(address.huisnummer), text(address.huisletter), text(address.toevoeging)].filter(Boolean).join(" "),
    postalCode: text(address.postcode),
    city: text(address.plaats),
    type: text(item.type),
    active: item.actief !== false,
  };
}

async function profile(kvkNumber: string, branchNumber?: string) {
  const basis = await kvk(`/v1/basisprofielen/${kvkNumber}`);
  const namesNode = record(basis.handelsnamen);
  const tradeNames = [text(namesNode.statutaireNaam), ...list(namesNode.handelsnamen).map(text)].filter(Boolean);
  const mainBranch = record(basis.hoofdvestiging);
  const resolvedBranch = branchNumber || text(mainBranch.vestigingsnummer);
  const branch = resolvedBranch ? await kvk(`/v1/vestigingsprofielen/${resolvedBranch}`) : {};
  const addresses = list(branch.adressen).map(record);
  const visit = addresses.find((item) => text(item.type).toLowerCase().includes("bezoek")) || addresses[0] || {};
  const postal = addresses.find((item) => text(item.type).toLowerCase().includes("post"));
  return {
    kvkNumber,
    branchNumber: resolvedBranch,
    companyName: tradeNames[0] || text(basis.naam),
    tradeNames,
    legalForm: text(basis.rechtsvorm),
    websites: list(branch.websites).map(text).filter(Boolean),
    visitAddress: {
      street: text(visit.straatnaam),
      houseNumber: [text(visit.huisnummer), text(visit.huisletter), text(visit.toevoeging)].filter(Boolean).join(" "),
      postalCode: text(visit.postcode), city: text(visit.plaats), country: text(visit.land) || "Nederland",
    },
    postalAddress: postal ? {
      street: text(postal.straatnaam),
      houseNumber: [text(postal.huisnummer), text(postal.huisletter), text(postal.toevoeging)].filter(Boolean).join(" "),
      postalCode: text(postal.postcode), city: text(postal.plaats), country: text(postal.land) || "Nederland",
    } : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const kvkNumber = (params.get("kvkNumber") || "").replace(/\D/g, "");
    const branchNumber = (params.get("branchNumber") || "").replace(/\D/g, "");
    if (kvkNumber) {
      if (kvkNumber.length !== 8) return NextResponse.json({ error: "Een KvK-nummer bestaat uit 8 cijfers." }, { status: 400 });
      return NextResponse.json(await profile(kvkNumber, branchNumber || undefined));
    }

    const name = (params.get("name") || "").trim();
    const city = (params.get("city") || "").trim();
    const postalCode = (params.get("postalCode") || "").replace(/\s/g, "").toUpperCase();
    const houseNumber = (params.get("houseNumber") || "").trim();
    if (!name && !(postalCode && houseNumber)) {
      return NextResponse.json({ error: "Zoek op bedrijfsnaam, eventueel met plaats, of op postcode met huisnummer." }, { status: 400 });
    }
    const query = new URLSearchParams({ pagina: "1", resultatenPerPagina: "20" });
    if (name) query.set("handelsnaam", name);
    if (city) query.set("plaats", city);
    if (postalCode) query.set("postcode", postalCode);
    if (houseNumber) query.set("huisnummer", houseNumber);
    const payload = await kvk(`/v2/zoeken?${query.toString()}`);
    return NextResponse.json({ results: list(payload.resultaten).map(mapSearchResult) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "KvK-zoekopdracht is niet gelukt." }, { status: 502 });
  }
}

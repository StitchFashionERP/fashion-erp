export type MasterDataEntity =
  | "brands"
  | "suppliers"
  | "collections"
  | "productTypes"
  | "categories"
  | "materials"
  | "fits"
  | "colorFamilies"
  | "sizes"
  | "seasons"
  | "countries";

export type MasterDataItem = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  sortOrder: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type NamedMasterData = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type CollectionStatus = "Concept" | "Actief" | "Gearchiveerd";

export type Collection = {
  id: string;
  code: string;
  name: string;
  season: string;
  year: number;
  status: CollectionStatus;
  startDate: string;
  endDate: string;
};

export const masterDataLabels: Record<MasterDataEntity, string> = {
  brands: "Merken",
  suppliers: "Leveranciers",
  collections: "Collecties",
  productTypes: "Producttypes",
  categories: "Categorieën",
  materials: "Materialen",
  fits: "Pasvormen",
  colorFamilies: "Kleurgroepen",
  sizes: "Maten",
  seasons: "Seizoenen",
  countries: "Landen",
};

const STORAGE_KEY = "stitch-master-data-v1";
const CHANGE_EVENT = "stitch-master-data-change";

const initialNames: Record<MasterDataEntity, string[]> = {
  brands: ["Demo Fashion"],
  suppliers: ["Nordic Fashion Supply"],
  collections: ["Core", "AW27", "SS27"],
  productTypes: ["T-shirt", "Blouse", "Jas", "Broek", "Jurk", "Trui"],
  categories: ["T-shirts", "Blouses", "Jassen", "Broeken", "Jurken", "Truien"],
  materials: [
    "100% katoen",
    "Biologisch katoen",
    "Linnen",
    "Wol",
    "Merinowol",
    "Viscose",
    "Polyester",
    "Denim",
    "Leer",
  ],
  fits: ["Slim fit", "Regular fit", "Relaxed fit", "Oversized", "Tailored fit"],
  colorFamilies: [
    "Zwart",
    "Wit",
    "Grijs",
    "Blauw",
    "Groen",
    "Rood",
    "Roze",
    "Paars",
    "Geel",
    "Oranje",
    "Bruin",
    "Beige",
  ],
  sizes: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "34", "36", "38", "40", "42", "44"],
  seasons: ["Voorjaar/Zomer", "Herfst/Winter", "Doorlopend"],
  countries: [
    "Albanië",
    "Andorra",
    "Armenië",
    "Azerbeidzjan",
    "België",
    "Bosnië en Herzegovina",
    "Bulgarije",
    "Cyprus",
    "Denemarken",
    "Duitsland",
    "Estland",
    "Finland",
    "Frankrijk",
    "Georgië",
    "Griekenland",
    "Hongarije",
    "Ierland",
    "IJsland",
    "Italië",
    "Kazachstan",
    "Kosovo",
    "Kroatië",
    "Letland",
    "Liechtenstein",
    "Litouwen",
    "Luxemburg",
    "Malta",
    "Moldavië",
    "Monaco",
    "Montenegro",
    "Nederland",
    "Noord-Macedonië",
    "Noorwegen",
    "Oekraïne",
    "Oostenrijk",
    "Polen",
    "Portugal",
    "Roemenië",
    "Rusland",
    "San Marino",
    "Servië",
    "Slovenië",
    "Slowakije",
    "Spanje",
    "Tsjechië",
    "Turkije",
    "Vaticaanstad",
    "Verenigd Koninkrijk",
    "Wit-Rusland",
    "Zweden",
    "Zwitserland",
  ],
};

const countryIsoCodes: Record<string, string> = {
  "Albanië": "AL",
  Andorra: "AD",
  "Armenië": "AM",
  Azerbeidzjan: "AZ",
  "België": "BE",
  "Bosnië en Herzegovina": "BA",
  Bulgarije: "BG",
  Cyprus: "CY",
  Denemarken: "DK",
  Duitsland: "DE",
  Estland: "EE",
  Finland: "FI",
  Frankrijk: "FR",
  "Georgië": "GE",
  Griekenland: "GR",
  Hongarije: "HU",
  Ierland: "IE",
  IJsland: "IS",
  "Italië": "IT",
  Kazachstan: "KZ",
  Kosovo: "XK",
  "Kroatië": "HR",
  Letland: "LV",
  Liechtenstein: "LI",
  Litouwen: "LT",
  Luxemburg: "LU",
  Malta: "MT",
  "Moldavië": "MD",
  Monaco: "MC",
  Montenegro: "ME",
  Nederland: "NL",
  "Noord-Macedonië": "MK",
  Noorwegen: "NO",
  "Oekraïne": "UA",
  Oostenrijk: "AT",
  Polen: "PL",
  Portugal: "PT",
  "Roemenië": "RO",
  Rusland: "RU",
  "San Marino": "SM",
  "Servië": "RS",
  "Slovenië": "SI",
  "Slowakije": "SK",
  Spanje: "ES",
  "Tsjechië": "CZ",
  Turkije: "TR",
  Vaticaanstad: "VA",
  "Verenigd Koninkrijk": "GB",
  "Wit-Rusland": "BY",
  Zweden: "SE",
  Zwitserland: "CH",
};

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function createMasterId(prefix: string, value: string) {
  return `${prefix}-${slug(value)}-${Date.now()}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function createInitialStore(): Record<MasterDataEntity, MasterDataItem[]> {
  const now = new Date().toISOString();

  return Object.fromEntries(
    Object.entries(initialNames).map(([entity, names]) => [
      entity,
      names.map((name, index) => ({
        id: `${entity}-${slug(name)}`,
        code:
          entity === "countries"
            ? countryIsoCodes[name] ?? slug(name).toUpperCase().replace(/-/g, "_")
            : slug(name).toUpperCase().replace(/-/g, "_"),
        name,
        active: true,
        sortOrder: index + 1,
        notes: "",
        createdAt: now,
        updatedAt: now,
      })),
    ]),
  ) as Record<MasterDataEntity, MasterDataItem[]>;
}

export function getMasterDataStore(): Record<MasterDataEntity, MasterDataItem[]> {
  const fallback = createInitialStore();
  if (!isBrowser()) return fallback;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<MasterDataEntity, MasterDataItem[]>>;

    return Object.fromEntries(
      (Object.keys(initialNames) as MasterDataEntity[]).map((entity) => [
        entity,
        Array.isArray(parsed[entity])
          ? [
              ...parsed[entity]!,
              ...fallback[entity].filter(
                (fallbackItem) =>
                  !parsed[entity]!.some(
                    (storedItem) =>
                      storedItem.name.toLowerCase() ===
                      fallbackItem.name.toLowerCase(),
                  ),
              ),
            ]
          : fallback[entity],
      ]),
    ) as Record<MasterDataEntity, MasterDataItem[]>;
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

function saveMasterDataStore(store: Record<MasterDataEntity, MasterDataItem[]>) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getMasterDataItems(entity: MasterDataEntity, includeInactive = false) {
  return getMasterDataStore()[entity]
    .filter((item) => includeInactive || item.active)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "nl"),
    );
}

export function addMasterDataItem(entity: MasterDataEntity, name: string, code?: string) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Naam is verplicht.");

  const store = getMasterDataStore();
  const existing = store[entity].find(
    (item) => item.name.toLowerCase() === cleanName.toLowerCase(),
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const item: MasterDataItem = {
    id: createMasterId(entity, cleanName),
    code: code?.trim() || slug(cleanName).toUpperCase().replace(/-/g, "_"),
    name: cleanName,
    active: true,
    sortOrder: store[entity].length + 1,
    notes: "",
    createdAt: now,
    updatedAt: now,
  };

  store[entity] = [...store[entity], item];
  saveMasterDataStore(store);
  return item;
}

export function updateMasterDataItem(
  entity: MasterDataEntity,
  id: string,
  changes: Partial<Pick<MasterDataItem, "code" | "name" | "active" | "sortOrder" | "notes">>,
) {
  const store = getMasterDataStore();
  store[entity] = store[entity].map((item) =>
    item.id === id ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item,
  );
  saveMasterDataStore(store);
}

export function deleteMasterDataItem(entity: MasterDataEntity, id: string) {
  const store = getMasterDataStore();
  store[entity] = store[entity].filter((item) => item.id !== id);
  saveMasterDataStore(store);
}

export function subscribeToMasterData(callback: () => void) {
  if (!isBrowser()) return () => undefined;

  const listener = () => callback();
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function toNamedMasterData(item: MasterDataItem): NamedMasterData {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    isActive: item.active,
  };
}

function saveNamedMasterData(entity: MasterDataEntity, items: NamedMasterData[]) {
  const store = getMasterDataStore();
  const now = new Date().toISOString();
  const existingById = new Map(store[entity].map((item) => [item.id, item]));

  store[entity] = items.map((item, index) => {
    const existing = existingById.get(item.id);
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      active: item.isActive,
      sortOrder: existing?.sortOrder ?? index + 1,
      notes: existing?.notes ?? "",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
  });

  saveMasterDataStore(store);
}

export const getBrands = () => getMasterDataItems("brands", true).map(toNamedMasterData);
export const saveBrands = (items: NamedMasterData[]) => saveNamedMasterData("brands", items);

export function getCollections(): Collection[] {
  const currentYear = new Date().getFullYear();

  return getMasterDataItems("collections", true).map((item) => {
    const stored = item as MasterDataItem & Partial<Collection>;

    return {
      id: item.id,
      code: item.code,
      name: item.name,
      season: stored.season ?? "Doorlopend",
      year: stored.year ?? currentYear,
      status: stored.status ?? (item.active ? "Actief" : "Gearchiveerd"),
      startDate: stored.startDate ?? "",
      endDate: stored.endDate ?? "",
    };
  });
}

export function saveCollections(collections: Collection[]) {
  const store = getMasterDataStore();
  const now = new Date().toISOString();
  const existingById = new Map(store.collections.map((item) => [item.id, item]));

  store.collections = collections.map((collection, index) => {
    const existing = existingById.get(collection.id);

    return {
      id: collection.id,
      code: collection.code,
      name: collection.name,
      active: collection.status !== "Gearchiveerd",
      sortOrder: existing?.sortOrder ?? index + 1,
      notes: existing?.notes ?? "",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      season: collection.season,
      year: collection.year,
      status: collection.status,
      startDate: collection.startDate,
      endDate: collection.endDate,
    } as MasterDataItem;
  });

  saveMasterDataStore(store);
}

export const getProductTypes = () => getMasterDataItems("productTypes", true).map(toNamedMasterData);
export const saveProductTypes = (items: NamedMasterData[]) => saveNamedMasterData("productTypes", items);

export const getCategories = () => getMasterDataItems("categories", true).map(toNamedMasterData);
export const saveCategories = (items: NamedMasterData[]) => saveNamedMasterData("categories", items);

export const getMaterials = () => getMasterDataItems("materials", true).map(toNamedMasterData);
export const saveMaterials = (items: NamedMasterData[]) => saveNamedMasterData("materials", items);

export const getFits = () => getMasterDataItems("fits", true).map(toNamedMasterData);
export const saveFits = (items: NamedMasterData[]) => saveNamedMasterData("fits", items);

export const getCountries = () => getMasterDataItems("countries", true).map(toNamedMasterData);
export const saveCountries = (items: NamedMasterData[]) => saveNamedMasterData("countries", items);

export const getColors = () => getMasterDataItems("colorFamilies", true).map(toNamedMasterData);
export const saveColors = (items: NamedMasterData[]) => saveNamedMasterData("colorFamilies", items);

export const getSizes = () => getMasterDataItems("sizes", true).map(toNamedMasterData);
export const saveSizes = (items: NamedMasterData[]) => saveNamedMasterData("sizes", items);

export const getSeasons = () => getMasterDataItems("seasons", true).map(toNamedMasterData);
export const saveSeasons = (items: NamedMasterData[]) => saveNamedMasterData("seasons", items);


// Tijdelijke compatibiliteit voor modules die nog vanuit master-data importeren.
export {
  getCustomers,
  saveCustomers,
  subscribeToCustomers,
} from "@/lib/customers";
export type { Customer, CustomerMasterData } from "@/lib/customers";

export {
  getSuppliers,
  saveSuppliers,
  subscribeToSuppliers,
} from "@/lib/suppliers";
export type { Supplier } from "@/lib/suppliers";

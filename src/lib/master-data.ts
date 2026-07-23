export type MasterDataEntity =
  | "brands"
  | "suppliers"
  | "collections"
  | "productTypes"
  | "categories"
  | "materials"
  | "fits"
  | "colorFamilies"
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

export const masterDataLabels: Record<MasterDataEntity, string> = {
  brands: "Merken",
  suppliers: "Leveranciers",
  collections: "Collecties",
  productTypes: "Producttypes",
  categories: "Categorieën",
  materials: "Materialen",
  fits: "Pasvormen",
  colorFamilies: "Kleurgroepen",
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
  seasons: ["Voorjaar/Zomer", "Herfst/Winter", "Doorlopend"],
  countries: [
    "Nederland",
    "België",
    "Duitsland",
    "Portugal",
    "Italië",
    "Spanje",
    "Turkije",
    "China",
    "India",
    "Bangladesh",
  ],
};

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createInitialStore(): Record<MasterDataEntity, MasterDataItem[]> {
  const now = new Date().toISOString();

  return Object.fromEntries(
    Object.entries(initialNames).map(([entity, names]) => [
      entity,
      names.map((name, index) => ({
        id: `${entity}-${slug(name)}`,
        code: slug(name).toUpperCase().replace(/-/g, "_"),
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

function isBrowser() {
  return typeof window !== "undefined";
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
    const parsed = JSON.parse(raw) as Partial<
      Record<MasterDataEntity, MasterDataItem[]>
    >;

    return Object.fromEntries(
      (Object.keys(initialNames) as MasterDataEntity[]).map((entity) => [
        entity,
        Array.isArray(parsed[entity]) ? parsed[entity] : fallback[entity],
      ]),
    ) as Record<MasterDataEntity, MasterDataItem[]>;
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

function saveMasterDataStore(
  store: Record<MasterDataEntity, MasterDataItem[]>,
) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getMasterDataItems(
  entity: MasterDataEntity,
  includeInactive = false,
) {
  return getMasterDataStore()[entity]
    .filter((item) => includeInactive || item.active)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.name.localeCompare(right.name, "nl"),
    );
}

export function addMasterDataItem(
  entity: MasterDataEntity,
  name: string,
  code?: string,
) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Naam is verplicht.");

  const store = getMasterDataStore();
  const existing = store[entity].find(
    (item) => item.name.toLowerCase() === cleanName.toLowerCase(),
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const item: MasterDataItem = {
    id: `${entity}-${slug(cleanName)}-${Date.now()}`,
    code: (code?.trim() || slug(cleanName).toUpperCase().replace(/-/g, "_")),
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
  changes: Partial<
    Pick<MasterDataItem, "code" | "name" | "active" | "sortOrder" | "notes">
  >,
) {
  const store = getMasterDataStore();
  store[entity] = store[entity].map((item) =>
    item.id === id
      ? { ...item, ...changes, updatedAt: new Date().toISOString() }
      : item,
  );
  saveMasterDataStore(store);
}

export function deleteMasterDataItem(
  entity: MasterDataEntity,
  id: string,
) {
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
export type CustomerMasterData = {
  id: string;
  customerNumber: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  vatNumber?: string;
  active?: boolean;
};

export function getCustomers(): CustomerMasterData[] {
  if (typeof window === "undefined") {
    return [];
  }

  const possibleKeys = [
    "stitch-customers",
    "stitch-customers-v1",
    "fashion-erp-customers",
    "customers",
  ];

  for (const key of possibleKeys) {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed as CustomerMasterData[];
      }

      if (Array.isArray(parsed.customers)) {
        return parsed.customers as CustomerMasterData[];
      }
    } catch {
      // Probeer de volgende opslaglocatie.
    }
  }

  return [];
}
export const getBrands = () =>
  getMasterDataItems("brands");

export const getSuppliers = () =>
  getMasterDataItems("suppliers");

export const getCollections = () =>
  getMasterDataItems("collections");

export const getProductTypes = () =>
  getMasterDataItems("productTypes");

export const getMaterials = () =>
  getMasterDataItems("materials");

export const getFits = () =>
  getMasterDataItems("fits");

export const getCountries = () =>
  getMasterDataItems("countries");

export const getColors = () =>
  getMasterDataItems("colorFamilies");

export const getSizes = () =>
  getMasterDataItems("sizes");
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NamedMasterDataManager } from "@/components/master-data/named-master-data-manager";
import { PageHeader } from "@/components/ui/page-header";
import {
  addMasterDataItem,
  deleteMasterDataItem,
  getMasterDataItems,
  updateMasterDataItem,
  type MasterDataEntity,
  type NamedMasterData,
} from "@/lib/master-data";
import styles from "./master-data.module.css";

function loadNamedMasterData(
  entity: MasterDataEntity,
): NamedMasterData[] {
  return getMasterDataItems(entity, true).map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    isActive: item.active,
  }));
}

function saveNamedMasterData(
  entity: MasterDataEntity,
  items: NamedMasterData[],
) {
  const existingItems = getMasterDataItems(entity, true);
  const incomingIds = new Set(items.map((item) => item.id));

  existingItems.forEach((existingItem) => {
    if (!incomingIds.has(existingItem.id)) {
      deleteMasterDataItem(entity, existingItem.id);
    }
  });

  items.forEach((item, index) => {
    const existingItem = existingItems.find(
      (existing) => existing.id === item.id,
    );

    if (existingItem) {
      updateMasterDataItem(entity, item.id, {
        code: item.code.trim(),
        name: item.name.trim(),
        active: item.isActive,
        sortOrder: index + 1,
      });

      return;
    }

    const createdItem = addMasterDataItem(
      entity,
      item.name,
      item.code,
    );

    updateMasterDataItem(entity, createdItem.id, {
      code: item.code.trim(),
      name: item.name.trim(),
      active: item.isActive,
      sortOrder: index + 1,
    });
  });
}

export default function MasterDataPage() {
  const [brands, setBrands] = useState<
    NamedMasterData[] | null
  >(null);

  const [productTypes, setProductTypes] = useState<
    NamedMasterData[] | null
  >(null);

  const [categories, setCategories] = useState<
    NamedMasterData[] | null
  >(null);

  const [colors, setColors] = useState<
    NamedMasterData[] | null
  >(null);

  const [sizes, setSizes] = useState<
    NamedMasterData[] | null
  >(null);

  const [countries, setCountries] = useState<
    NamedMasterData[] | null
  >(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBrands(loadNamedMasterData("brands"));

    setProductTypes(
      loadNamedMasterData("productTypes"),
    );

    setCategories(
      loadNamedMasterData("categories"),
    );

    setColors(
      loadNamedMasterData("colorFamilies"),
    );

    setSizes(
      loadNamedMasterData("sizes"),
    );

    setCountries(
      loadNamedMasterData("countries"),
    );
  }, []);

  if (
    !brands ||
    !productTypes ||
    !categories ||
    !colors ||
    !sizes ||
    !countries
  ) {
    return (
      <section className="content-card">
        Stamgegevens laden...
      </section>
    );
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/instellingen">
          Instellingen
        </Link>

        <span>›</span>
        <span>Stamgegevens</span>
      </div>

      <PageHeader
        eyebrow="Instellingen"
        title="Stamgegevens"
        description="Beheer de vaste keuzelijsten die binnen de applicatie worden gebruikt."
      />

      <section className={styles.grid}>
        <NamedMasterDataManager
          title="Merken"
          description="Merkcodes vormen het eerste deel van het artikelnummer."
          idPrefix="brand"
          initialItems={brands}
          onSave={(items) => {
            saveNamedMasterData("brands", items);
            setBrands(loadNamedMasterData("brands"));
          }}
        />

        <NamedMasterDataManager
          title="Producttypes"
          description="Uitbreidbare kledingsoorten met een unieke tweecijferige code."
          idPrefix="product-type"
          initialItems={productTypes}
          onSave={(items) => {
            saveNamedMasterData(
              "productTypes",
              items,
            );

            setProductTypes(
              loadNamedMasterData("productTypes"),
            );
          }}
        />

        <NamedMasterDataManager
          title="Categorieën"
          description="Productgroepen zoals blouses, jurken en broeken."
          idPrefix="category"
          initialItems={categories}
          onSave={(items) => {
            saveNamedMasterData(
              "categories",
              items,
            );

            setCategories(
              loadNamedMasterData("categories"),
            );
          }}
        />

        <NamedMasterDataManager
          title="Kleuren"
          description="Kleuren die beschikbaar zijn voor productvarianten."
          idPrefix="color"
          initialItems={colors}
          onSave={(items) => {
            saveNamedMasterData(
              "colorFamilies",
              items,
            );

            setColors(
              loadNamedMasterData("colorFamilies"),
            );
          }}
        />

        <NamedMasterDataManager
          title="Landen"
          description="Centrale landenlijst voor bedrijfsgegevens, leveranciers en klanten. Gebruik bij voorkeur de ISO-landcode."
          idPrefix="country"
          initialItems={countries}
          onSave={(items) => {
            saveNamedMasterData(
              "countries",
              items,
            );

            setCountries(
              loadNamedMasterData("countries"),
            );
          }}
        />

        <NamedMasterDataManager
          title="Maten"
          description="Letter-, cijfer- en unieke maten."
          idPrefix="size"
          initialItems={sizes}
          onSave={(items) => {
            saveNamedMasterData("sizes", items);
            setSizes(loadNamedMasterData("sizes"));
          }}
        />
      </section>
    </div>
  );
}
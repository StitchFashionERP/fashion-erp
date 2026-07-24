"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { NamedMasterDataManager } from "@/components/master-data/named-master-data-manager";
import {
  getBrands,
  getProductTypes,
  getCategories,
  getColors,
  getSizes,
  getCountries,
  saveBrands,
  saveProductTypes,
  saveCategories,
  saveColors,
  saveSizes,
  saveCountries,
  type NamedMasterData,
} from "@/lib/master-data";
import styles from "./master-data.module.css";

export default function MasterDataPage() {
  const [brands, setBrands] = useState<NamedMasterData[] | null>(null);
  const [productTypes, setProductTypes] = useState<NamedMasterData[] | null>(null);
  const [categories, setCategories] = useState<NamedMasterData[] | null>(null);
  const [colors, setColors] = useState<NamedMasterData[] | null>(null);
  const [sizes, setSizes] = useState<NamedMasterData[] | null>(null);
  const [countries, setCountries] = useState<NamedMasterData[] | null>(null);

  useEffect(() => {
    setBrands(getBrands());
    setProductTypes(getProductTypes());
    setCategories(getCategories());
    setColors(getColors());
    setSizes(getSizes());
    setCountries(getCountries());
  }, []);

  if (!brands || !productTypes || !categories || !colors || !sizes || !countries) {
    return <section className="content-card">Stamgegevens laden...</section>;
  }

  return (
    <div>
      <div className={styles.breadcrumb}>
        <Link href="/instellingen">Instellingen</Link>
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
            setBrands(items);
            saveBrands(items);
          }}
        />

        <NamedMasterDataManager
          title="Producttypes"
          description="Uitbreidbare kledingsoorten met een unieke tweecijferige code."
          idPrefix="product-type"
          initialItems={productTypes}
          onSave={(items) => {
            setProductTypes(items);
            saveProductTypes(items);
          }}
        />

        <NamedMasterDataManager
          title="Categorieën"
          description="Productgroepen zoals blouses, jurken en broeken."
          idPrefix="category"
          initialItems={categories}
          onSave={(items) => {
            setCategories(items);
            saveCategories(items);
          }}
        />

        <NamedMasterDataManager
          title="Kleuren"
          description="Kleuren die beschikbaar zijn voor productvarianten."
          idPrefix="color"
          initialItems={colors}
          onSave={(items) => {
            setColors(items);
            saveColors(items);
          }}
        />

        <NamedMasterDataManager
          title="Landen"
          description="Centrale landenlijst voor bedrijfsgegevens, leveranciers en klanten. Gebruik bij voorkeur de ISO-landcode."
          idPrefix="country"
          initialItems={countries}
          onSave={(items) => {
            setCountries(items);
            saveCountries(items);
          }}
        />

        <NamedMasterDataManager
          title="Maten"
          description="Letter-, cijfer- en unieke maten."
          idPrefix="size"
          initialItems={sizes}
          onSave={(items) => {
            setSizes(items);
            saveSizes(items);
          }}
        />
      </section>
    </div>
  );
}

"use client";

import {
  calculatePricingV2,
  defaultPricingLocks,
  resetPricingToCompanyDefaults,
  type PricingLockField,
  type PricingLocks,
  type PricingStrategy,
  type PricingV2Result,
} from "@/lib/pricing-engine";
import type { PricingDefaults } from "@/lib/company-settings";
import styles from "./PricingCalculator.module.css";

export type PricingCalculatorValue = {
  supplierPurchasePrice: string;
  shippingCosts: string;
  otherCosts: string;
  brandMarkup: string;
  salesPrice: string;
  retailerMarkup: string;
  recommendedRetailPrice: string;
  pricingStrategy: PricingStrategy;
  pricingLocks: PricingLocks;
};

type PricingCalculatorProps = {
  value: PricingCalculatorValue;
  defaults: PricingDefaults;
  onChange: (value: PricingCalculatorValue, result: PricingV2Result) => void;
};

type LockControlProps = {
  field: PricingLockField;
  checked: boolean;
  onToggle: (field: PricingLockField) => void;
};

type CurrencyFieldName =
  | "supplierPurchasePrice"
  | "shippingCosts"
  | "otherCosts"
  | "salesPrice"
  | "recommendedRetailPrice";

type CurrencyFieldProps = {
  label: string;
  field: CurrencyFieldName;
  value: string;
  locked: boolean;
  onValueChange: (field: PricingLockField, value: string) => void;
  onToggleLock: (field: PricingLockField) => void;
};

type MarkupFieldName = "brandMarkup" | "retailerMarkup";

type MarkupFieldProps = {
  label: string;
  field: MarkupFieldName;
  value: string;
  locked: boolean;
  onValueChange: (field: PricingLockField, value: string) => void;
  onToggleLock: (field: PricingLockField) => void;
};

function parseNumber(value: string) {
  return Number(value.replace(",", ".")) || 0;
}

function displayNumber(value: number) {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function LockControl({
  field,
  checked,
  onToggle,
}: LockControlProps) {
  return (
    <label className={styles.lockControl}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(field)}
      />
      <span>Vast</span>
    </label>
  );
}

function CurrencyField({
  label,
  field,
  value,
  locked,
  onValueChange,
  onToggleLock,
}: CurrencyFieldProps) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <div className={styles.inputWithLock}>
        <div className={styles.currencyInput}>
          <span>€</span>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(event) => onValueChange(field, event.target.value)}
          />
        </div>
        <LockControl
          field={field}
          checked={locked}
          onToggle={onToggleLock}
        />
      </div>
    </label>
  );
}

function MarkupField({
  label,
  field,
  value,
  locked,
  onValueChange,
  onToggleLock,
}: MarkupFieldProps) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <div className={styles.inputWithLock}>
        <div className={styles.markupInput}>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(event) => onValueChange(field, event.target.value)}
          />
          <span>×</span>
        </div>
        <LockControl
          field={field}
          checked={locked}
          onToggle={onToggleLock}
        />
      </div>
    </label>
  );
}

export function PricingCalculator({
  value,
  defaults,
  onChange,
}: PricingCalculatorProps) {
  function calculate(
    nextValue: PricingCalculatorValue,
    changedField: PricingLockField | null,
  ) {
    return calculatePricingV2(
      {
        supplierPurchasePrice: parseNumber(nextValue.supplierPurchasePrice),
        shippingCosts: parseNumber(nextValue.shippingCosts),
        otherCosts: parseNumber(nextValue.otherCosts),
        brandMarkup: parseNumber(nextValue.brandMarkup),
        salesPrice: parseNumber(nextValue.salesPrice),
        retailerMarkup: parseNumber(nextValue.retailerMarkup),
        recommendedRetailPrice: parseNumber(nextValue.recommendedRetailPrice),
        strategy: nextValue.pricingStrategy,
        locks: nextValue.pricingLocks,
        changedField,
      },
      defaults,
    );
  }

  function syncResult(
    source: PricingCalculatorValue,
    result: PricingV2Result,
    preserveField?: PricingLockField,
  ): PricingCalculatorValue {
    return {
      supplierPurchasePrice:
        preserveField === "supplierPurchasePrice"
          ? source.supplierPurchasePrice
          : displayNumber(result.supplierPurchasePrice),
      shippingCosts:
        preserveField === "shippingCosts"
          ? source.shippingCosts
          : displayNumber(result.shippingCosts),
      otherCosts:
        preserveField === "otherCosts"
          ? source.otherCosts
          : displayNumber(result.otherCosts),
      brandMarkup:
        preserveField === "brandMarkup"
          ? source.brandMarkup
          : displayNumber(result.brandMarkup),
      salesPrice:
        preserveField === "salesPrice"
          ? source.salesPrice
          : displayNumber(result.salesPrice),
      retailerMarkup:
        preserveField === "retailerMarkup"
          ? source.retailerMarkup
          : displayNumber(result.retailerMarkup),
      recommendedRetailPrice:
        preserveField === "recommendedRetailPrice"
          ? source.recommendedRetailPrice
          : displayNumber(result.recommendedRetailPrice),
      pricingStrategy: result.strategy,
      pricingLocks: result.locks,
    };
  }

  function updateField(field: PricingLockField, fieldValue: string) {
    const nextValue = {
      ...value,
      [field]: fieldValue,
    };
    const result = calculate(nextValue, field);
    onChange(syncResult(nextValue, result, field), result);
  }

  function toggleLock(field: PricingLockField) {
    const nextValue = {
      ...value,
      pricingLocks: {
        ...value.pricingLocks,
        [field]: !value.pricingLocks[field],
      },
    };
    const result = calculate(nextValue, null);
    onChange(syncResult(nextValue, result), result);
  }

  function changeStrategy(strategy: PricingStrategy) {
    const nextValue = {
      ...value,
      pricingStrategy: strategy,
    };
    const result = calculate(nextValue, null);
    onChange(syncResult(nextValue, result), result);
  }

  function restoreDefaults() {
    const result = resetPricingToCompanyDefaults(
      {
        supplierPurchasePrice: parseNumber(value.supplierPurchasePrice),
        shippingCosts: parseNumber(value.shippingCosts),
        otherCosts: parseNumber(value.otherCosts),
      },
      defaults,
    );

    const nextValue: PricingCalculatorValue = {
      ...value,
      pricingStrategy: "automatic",
      pricingLocks: { ...defaultPricingLocks },
    };
    onChange(syncResult(nextValue, result), result);
  }

  const pricing = calculate(value, null);

  return (
    <article className="content-card">
      <div className="content-card-header">
        <div>
          <h2 className="content-card-title">Pricing Engine 3.0</h2>
          <p className="content-card-description">
            Vergrendel de waarden die vast moeten blijven. Alle vrije velden
            worden direct opnieuw berekend.
          </p>
        </div>

        <button
          type="button"
          className="button button-secondary"
          onClick={restoreDefaults}
        >
          Herstel bedrijfsinstellingen
        </button>
      </div>

      <div className={styles.strategyRow}>
        <label className={styles.field}>
          <span>Prijsstrategie</span>
          <select
            value={value.pricingStrategy}
            onChange={(event) =>
              changeStrategy(event.target.value as PricingStrategy)
            }
          >
            <option value="automatic">Automatisch</option>
            <option value="manual">Handmatig</option>
          </select>
        </label>
      </div>

      <div className={styles.sections}>
        <section className={styles.block}>
          <div className={styles.blockHeader}>
            <span>Kostprijs</span>
            <strong>{formatCurrency(pricing.totalCost)}</strong>
          </div>
          <div className={styles.grid}>
            <CurrencyField
              label="Inkoopprijs leverancier"
              field="supplierPurchasePrice"
              value={value.supplierPurchasePrice}
              locked={value.pricingLocks.supplierPurchasePrice}
              onValueChange={updateField}
              onToggleLock={toggleLock}
            />
            <CurrencyField
              label="Verzendkosten"
              field="shippingCosts"
              value={value.shippingCosts}
              locked={value.pricingLocks.shippingCosts}
              onValueChange={updateField}
              onToggleLock={toggleLock}
            />
            <CurrencyField
              label="Overige kosten"
              field="otherCosts"
              value={value.otherCosts}
              locked={value.pricingLocks.otherCosts}
              onValueChange={updateField}
              onToggleLock={toggleLock}
            />
            <div className={styles.calculatedField}>
              <span>Totale kostprijs</span>
              <strong>{formatCurrency(pricing.totalCost)}</strong>
            </div>
          </div>
        </section>

        <section className={styles.block}>
          <div className={styles.blockHeader}>
            <span>Verkoop aan winkels</span>
            <strong>excl. btw</strong>
          </div>
          <div className={styles.grid}>
            <MarkupField
              label="Markup merk"
              field="brandMarkup"
              value={value.brandMarkup}
              locked={value.pricingLocks.brandMarkup}
              onValueChange={updateField}
              onToggleLock={toggleLock}
            />
            <CurrencyField
              label="Verkoopprijs"
              field="salesPrice"
              value={value.salesPrice}
              locked={value.pricingLocks.salesPrice}
              onValueChange={updateField}
              onToggleLock={toggleLock}
            />
            <div className={styles.calculatedField}>
              <span>Marge</span>
              <strong>{formatCurrency(pricing.ownMarginAmount)}</strong>
            </div>
            <div className={styles.calculatedField}>
              <span>Margepercentage</span>
              <strong>
                {pricing.ownMarginPercentage.toLocaleString("nl-NL")}%
              </strong>
            </div>
          </div>
        </section>

        <section className={styles.block}>
          <div className={styles.blockHeader}>
            <span>Adviesverkoopprijs</span>
            <strong>incl. {pricing.vatPercentage}% btw</strong>
          </div>
          <div className={styles.grid}>
            <MarkupField
              label="Markup retailer"
              field="retailerMarkup"
              value={value.retailerMarkup}
              locked={value.pricingLocks.retailerMarkup}
              onValueChange={updateField}
              onToggleLock={toggleLock}
            />
            <CurrencyField
              label="Adviesverkoopprijs"
              field="recommendedRetailPrice"
              value={value.recommendedRetailPrice}
              locked={value.pricingLocks.recommendedRetailPrice}
              onValueChange={updateField}
              onToggleLock={toggleLock}
            />
            <div className={styles.calculatedField}>
              <span>Retailermarge excl. btw</span>
              <strong>{formatCurrency(pricing.retailerMarginAmount)}</strong>
            </div>
            <div className={styles.calculatedField}>
              <span>Retailermargepercentage</span>
              <strong>
                {pricing.retailerMarginPercentage.toLocaleString("nl-NL")}%
              </strong>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

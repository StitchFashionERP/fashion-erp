"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./barcode-scanner-input.module.css";

type BarcodeScannerInputProps = {
  label?: string;

  active?: boolean;

  onScan: (barcode: string) => void;

  onUnknownBarcode?: (
    barcode: string,
  ) => void;

  placeholder?: string;

  disabled?: boolean;

  clearAfterScan?: boolean;

  autoFocus?: boolean;

  minimumLength?: number;

  scanTimeoutMs?: number;
};

function normalizeBarcode(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function BarcodeScannerInput({
  label,
  active = true,
  onScan,
  onUnknownBarcode,
  placeholder = "Scan een barcode of voer deze handmatig in...",
  disabled = false,
  clearAfterScan = true,
  autoFocus = true,
  minimumLength = 3,
  scanTimeoutMs = 80,
}: BarcodeScannerInputProps) {
  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const keyboardBufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  const [value, setValue] = useState("");
  const [lastScan, setLastScan] =
    useState<string | null>(null);

  const [message, setMessage] = useState<
    string | null
  >(null);

  const [messageTone, setMessageTone] =
    useState<"success" | "error" | "info">(
      "info",
    );

  useEffect(() => {
    if (
      active &&
      autoFocus &&
      !disabled
    ) {
      inputRef.current?.focus();
    }
  }, [active, autoFocus, disabled]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage(null);
    }, 2500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [message]);

  useEffect(() => {
    if (!active || disabled) {
      return;
    }

    function handleScannerKeyboard(
      event: KeyboardEvent,
    ) {
      const target =
        event.target as HTMLElement | null;

      const isEditableTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isEditableTarget) {
        return;
      }

      const now = Date.now();

      if (
        now - lastKeyTimeRef.current >
        scanTimeoutMs
      ) {
        keyboardBufferRef.current = "";
      }

      lastKeyTimeRef.current = now;

      if (event.key === "Enter") {
        const barcode = normalizeBarcode(
          keyboardBufferRef.current,
        );

        keyboardBufferRef.current = "";

        if (
          barcode.length >= minimumLength
        ) {
          event.preventDefault();
          processBarcode(barcode);
        }

        return;
      }

      if (
        event.key.length === 1 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        keyboardBufferRef.current +=
          event.key;
      }
    }

    document.addEventListener(
      "keydown",
      handleScannerKeyboard,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleScannerKeyboard,
      );
    };
  }, [
    active,
    disabled,
    minimumLength,
    scanTimeoutMs,
  ]);

  function processBarcode(
    rawBarcode: string,
  ) {
    const barcode =
      normalizeBarcode(rawBarcode);

    if (
      barcode.length < minimumLength
    ) {
      setMessageTone("error");

      setMessage(
        `Een barcode moet minimaal ${minimumLength} tekens bevatten.`,
      );

      return;
    }

    try {
      onScan(barcode);

      setLastScan(barcode);
      setMessageTone("success");
      setMessage(
        `Barcode ${barcode} verwerkt.`,
      );

      if (clearAfterScan) {
        setValue("");
      }
    } catch (error) {
      setLastScan(barcode);
      setMessageTone("error");

      setMessage(
        error instanceof Error
          ? error.message
          : "De barcode kon niet worden verwerkt.",
      );

      onUnknownBarcode?.(barcode);
    }

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();
    processBarcode(value);
  }

  return (
    <div className={styles.wrapper}>
      <form
        className={[
          styles.scanner,
          active
            ? styles.scannerActive
            : "",
          disabled
            ? styles.scannerDisabled
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onSubmit={handleSubmit}
      >
        <div className={styles.scannerIcon}>
          {active ? "▥" : "□"}
        </div>

        <div className={styles.inputWrapper}>
          {label && <label>{label}</label>}
          <input
            ref={inputRef}
            type="text"
            value={value}
            disabled={disabled}
            autoComplete="off"
            inputMode="text"
            spellCheck={false}
            placeholder={placeholder}
            onChange={(event) =>
              setValue(event.target.value)
            }
          />

          <div className={styles.scannerStatus}>
            <span
              className={
                active
                  ? styles.statusActive
                  : styles.statusInactive
              }
            />

            {active
              ? "Scanner actief"
              : "Scanner niet actief"}
          </div>
        </div>

        {value && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            aria-label="Barcode wissen"
          >
            ×
          </button>
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={
            disabled ||
            value.trim().length <
              minimumLength
          }
        >
          Verwerken
        </button>
      </form>

      <div className={styles.helpRow}>
        <span>
          Scan een barcode of typ deze
          handmatig en druk op Enter.
        </span>

        {lastScan && (
          <span>
            Laatste scan:{" "}
            <strong>{lastScan}</strong>
          </span>
        )}
      </div>

      {message && (
        <div
          className={[
            styles.message,
            messageTone === "success"
              ? styles.messageSuccess
              : "",
            messageTone === "error"
              ? styles.messageError
              : "",
            messageTone === "info"
              ? styles.messageInfo
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span>
            {messageTone === "success"
              ? "✓"
              : messageTone === "error"
                ? "!"
                : "i"}
          </span>

          {message}
        </div>
      )}
    </div>
  );
}
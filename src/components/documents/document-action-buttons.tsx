"use client";

import { useState } from "react";
import { SendDocumentDialog } from "@/components/documents/send-document-dialog";
import {
  downloadBusinessDocumentPdf,
  openBusinessDocumentPdf,
} from "@/lib/document-pdf";
import type { BusinessDocumentType } from "@/lib/document-emails";
import styles from "./document-action-buttons.module.css";

type DocumentActionButtonsProps = {
  referenceId: string;

  documentType: BusinessDocumentType;

  emailLabel: string;
  printLabel?: string;

  emailButtonClassName?: string;
  printButtonClassName?: string;

  onSent?: () => void;
};

export function DocumentActionButtons({
  referenceId,
  documentType,
  emailLabel,
  printLabel = "PDF openen",
  emailButtonClassName = "button button-primary",
  printButtonClassName = "button button-secondary",
  onSent,
}: DocumentActionButtonsProps) {
  const [showSendDialog, setShowSendDialog] =
    useState(false);

  const [error, setError] = useState("");

  function handleOpenPdf() {
    try {
      openBusinessDocumentPdf(
        documentType,
        referenceId,
      );

      setError("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "PDF openen is niet gelukt.",
      );
    }
  }

  function handleDownloadPdf() {
    try {
      downloadBusinessDocumentPdf(
        documentType,
        referenceId,
      );

      setError("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "PDF downloaden is niet gelukt.",
      );
    }
  }

  return (
    <>
      <div className={styles.actions}>
        <button
          type="button"
          className={printButtonClassName}
          onClick={handleOpenPdf}
        >
          {printLabel}
        </button>

        <button
          type="button"
          className={styles.downloadButton}
          onClick={handleDownloadPdf}
          title="PDF downloaden"
          aria-label="PDF downloaden"
        >
          ↓
        </button>

        <button
          type="button"
          className={emailButtonClassName}
          onClick={() =>
            setShowSendDialog(true)
          }
        >
          {emailLabel}
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <span>!</span>
          {error}
        </div>
      )}

      <SendDocumentDialog
        open={showSendDialog}
        documentType={documentType}
        referenceId={referenceId}
        onClose={() =>
          setShowSendDialog(false)
        }
        onSent={() => {
          onSent?.();
        }}
      />
    </>
  );
}
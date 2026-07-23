"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  createDocumentEmailDraft,
  sendDocumentEmail,
  type BusinessDocumentType,
  type DocumentEmailDraft,
} from "@/lib/document-emails";
import {
  createBusinessDocumentPdfAttachment,
  openBusinessDocumentPdf,
} from "@/lib/document-pdf";
import styles from "./send-document-dialog.module.css";

type SendDocumentDialogProps = {
  open: boolean;

  documentType: BusinessDocumentType;
  referenceId: string;

  onClose: () => void;

  onSent?: (
    draft: DocumentEmailDraft,
  ) => void;
};

function getDocumentLabel(
  documentType: BusinessDocumentType,
) {
  if (documentType === "PURCHASE_ORDER") {
    return "Inkooporder";
  }

  if (
    documentType ===
    "SALES_ORDER_CONFIRMATION"
  ) {
    return "Orderbevestiging";
  }

  if (documentType === "PACKING_SLIP") {
    return "Pakbon";
  }

  if (documentType === "CREDIT_NOTE") {
    return "Creditfactuur";
  }

  return "Factuur";
}

export function SendDocumentDialog({
  open,
  documentType,
  referenceId,
  onClose,
  onSent,
}: SendDocumentDialogProps) {
  const [draft, setDraft] =
    useState<DocumentEmailDraft | null>(null);

  const [error, setError] = useState("");
  const [sending, setSending] =
    useState(false);
  const [preparing, setPreparing] =
    useState(false);
  const [sent, setSent] =
    useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function prepareDraft() {
      setPreparing(true);
      setError("");
      setSending(false);
      setSent(false);
      setDraft(null);

      try {
        const emailDraft =
          createDocumentEmailDraft(
            documentType,
            referenceId,
          );

        const pdfAttachment =
          createBusinessDocumentPdfAttachment(
            documentType,
            referenceId,
          );

        if (cancelled) {
          return;
        }

        setDraft({
          ...emailDraft,
          includeAttachment: true,
          attachment: pdfAttachment,
        });
      } catch (caughtError) {
        if (cancelled) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Document laden is niet gelukt.",
        );
      } finally {
        if (!cancelled) {
          setPreparing(false);
        }
      }
    }

    void prepareDraft();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    documentType,
    referenceId,
  ]);

  if (!open) {
    return null;
  }

  function updateDraft(
    changes: Partial<DocumentEmailDraft>,
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            ...changes,
          }
        : current,
    );
  }

  function handlePreview() {
    try {
      openBusinessDocumentPdf(
        documentType,
        referenceId,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "PDF openen is niet gelukt.",
      );
    }
  }

  async function handleSend() {
    if (!draft) {
      return;
    }

    if (!draft.to.trim()) {
      setError(
        "Vul het e-mailadres van de ontvanger in.",
      );

      return;
    }

    if (!draft.subject.trim()) {
      setError("Vul een onderwerp in.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const finalDraft =
        draft.includeAttachment
          ? {
              ...draft,
              attachment:
                createBusinessDocumentPdfAttachment(
                  documentType,
                  referenceId,
                ),
            }
          : draft;

      const result =
        await sendDocumentEmail({
          draft: finalDraft,
          sentBy: "Daan",
        });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setDraft(finalDraft);
      setSent(true);
      onSent?.(finalDraft);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "E-mail versturen is niet gelukt.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-document-title"
      >
        <header
          className={styles.dialogHeader}
        >
          <div>
            <span>Document versturen</span>

            <h2 id="send-document-title">
              {getDocumentLabel(
                documentType,
              )}{" "}
              {draft?.referenceNumber ?? ""}
            </h2>

            <p>
              Controleer de ontvanger,
              begeleidende tekst en PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
          >
            ×
          </button>
        </header>

        {sent ? (
          <div className={styles.successState}>
            <div>✓</div>

            <h3>E-mail verzonden</h3>

            <p>
              Het document is met PDF-bijlage
              verzonden naar{" "}
              <strong>{draft?.to}</strong>.
            </p>

            <button
              type="button"
              className="button button-primary"
              onClick={onClose}
            >
              Sluiten
            </button>
          </div>
        ) : (
          <>
            <div className={styles.dialogBody}>
              {error && (
                <div
                  className={styles.errorBanner}
                >
                  <span>!</span>
                  {error}
                </div>
              )}

              {preparing || !draft ? (
                <div
                  className={styles.loadingState}
                >
                  PDF en e-mail voorbereiden...
                </div>
              ) : (
                <>
                  <div className={styles.formGrid}>
                    <label
                      className={styles.fullWidth}
                    >
                      <span>Aan</span>

                      <input
                        type="email"
                        value={draft.to}
                        onChange={(event) =>
                          updateDraft({
                            to: event.target.value,
                          })
                        }
                        placeholder="naam@bedrijf.nl"
                      />
                    </label>

                    <label>
                      <span>CC</span>

                      <input
                        type="text"
                        value={draft.cc}
                        onChange={(event) =>
                          updateDraft({
                            cc: event.target.value,
                          })
                        }
                        placeholder="Optioneel"
                      />
                    </label>

                    <label>
                      <span>BCC</span>

                      <input
                        type="text"
                        value={draft.bcc}
                        onChange={(event) =>
                          updateDraft({
                            bcc: event.target.value,
                          })
                        }
                        placeholder="Optioneel"
                      />
                    </label>

                    <label
                      className={styles.fullWidth}
                    >
                      <span>Onderwerp</span>

                      <input
                        type="text"
                        value={draft.subject}
                        onChange={(event) =>
                          updateDraft({
                            subject:
                              event.target.value,
                          })
                        }
                      />
                    </label>

                    <label
                      className={styles.fullWidth}
                    >
                      <span>
                        Begeleidende tekst
                      </span>

                      <textarea
                        value={draft.message}
                        onChange={(event) =>
                          updateDraft({
                            message:
                              event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>

                  <label
                    className={
                      styles.attachmentOption
                    }
                  >
                    <input
                      type="checkbox"
                      checked={
                        draft.includeAttachment
                      }
                      onChange={(event) =>
                        updateDraft({
                          includeAttachment:
                            event.target.checked,
                        })
                      }
                    />

                    <div>
                      <strong>
                        PDF als bijlage
                      </strong>

                      <span>
                        {draft.attachment
                          ?.filename ||
                          "Geen bijlage"}
                      </span>
                    </div>
                  </label>

                  <div className={styles.infoBox}>
                    De PDF bevat uitsluitend het
                    document. De navigatie,
                    sidebar en knoppen van het ERP
                    staan er niet op.
                  </div>
                </>
              )}
            </div>

            <footer
              className={styles.dialogFooter}
            >
              <button
                type="button"
                className="button button-secondary"
                onClick={handlePreview}
                disabled={preparing}
              >
                PDF bekijken
              </button>

              <button
                type="button"
                className="button button-secondary"
                onClick={onClose}
              >
                Annuleren
              </button>

              <button
                type="button"
                className="button button-primary"
                disabled={
                  sending ||
                  preparing ||
                  !draft
                }
                onClick={handleSend}
              >
                {sending
                  ? "Versturen..."
                  : "E-mail versturen"}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
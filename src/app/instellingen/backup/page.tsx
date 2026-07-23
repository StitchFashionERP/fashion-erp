"use client";

import {
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  downloadStitchBackup,
  restoreStitchBackup,
} from "@/lib/backup";

export default function BackupPage() {
  const [error, setError] = useState("");

  return (
    <div>
      <PageHeader
        eyebrow="Bedrijfsinstellingen"
        title="Back-up en herstel"
        description="Exporteer alle lokale STITCH-gegevens en herstel ze later in dezelfde applicatie."
      />

      {error && (
        <div className="master-data-error">
          ! {error}
        </div>
      )}

      <section className="content-card">
        <div style={{ padding: 20 }}>
          <h2 className="content-card-title">
            Lokale gegevens
          </h2>
          <p className="content-card-description">
            Gebruik dit zolang STITCH nog met lokale
            testdata werkt. Bij de productiedatabase
            wordt dit vervangen door automatische
            serverback-ups.
          </p>

          <div
            className="button-group"
            style={{ marginTop: 16 }}
          >
            <button
              type="button"
              className="button button-primary"
              onClick={downloadStitchBackup}
            >
              Back-up downloaden
            </button>

            <label className="button button-secondary">
              Back-up herstellen
              <input
                type="file"
                accept="application/json"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                }}
                onChange={async (event) => {
                  const file =
                    event.target.files?.[0];

                  if (!file) return;

                  try {
                    await restoreStitchBackup(
                      file,
                    );
                  } catch (caughtError) {
                    setError(
                      caughtError instanceof Error
                        ? caughtError.message
                        : "Herstellen is mislukt.",
                    );
                  }
                }}
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}

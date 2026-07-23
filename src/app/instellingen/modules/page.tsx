"use client";

import {
  useEffect,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  getStitchModuleSettings,
  saveStitchModuleSettings,
  type StitchModuleSettings,
} from "@/lib/module-settings";
import styles from "./modules.module.css";

export default function ModulesSettingsPage() {
  const [settings, setSettings] =
    useState<StitchModuleSettings>({
      production: false,
    });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(getStitchModuleSettings());
  }, []);

  function save() {
    saveStitchModuleSettings(settings);
    setSaved(true);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Bedrijfsinstellingen"
        title="Modules"
        description="Toon alleen de onderdelen die binnen jouw bedrijf worden gebruikt."
      />

      {saved && (
        <div className={styles.success}>
          ✓ Module-instellingen opgeslagen.
        </div>
      )}

      <section className="content-card">
        <div className={styles.moduleList}>
          <article className={styles.moduleRow}>
            <div>
              <strong>Inkooporders</strong>
              <p>
                Voor het inkopen van
                kant-en-klare modeproducten.
              </p>
            </div>

            <span className={styles.required}>
              Altijd actief
            </span>
          </article>

          <article className={styles.moduleRow}>
            <div>
              <strong>Productie</strong>
              <p>
                Alleen nodig wanneer je later
                producten speciaal laat produceren.
              </p>
            </div>

            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={settings.production}
                onChange={(event) => {
                  setSaved(false);
                  setSettings((current) => ({
                    ...current,
                    production:
                      event.target.checked,
                  }));
                }}
              />
              <span />
            </label>
          </article>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className="button button-primary"
            onClick={save}
          >
            Instellingen opslaan
          </button>
        </div>
      </section>
    </div>
  );
}

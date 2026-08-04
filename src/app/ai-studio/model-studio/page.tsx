import styles from "../ai-studio.module.css";

export default function ModelStudioPage() {
  return (
    <>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>
            Voorbereid voor vervolg
          </p>
          <h1 className={styles.title}>
            Model Studio
          </h1>
          <p className={styles.description}>
            Gebruik een goedgekeurde packshot als basis voor een
            geloofwaardige foto van een model met hetzelfde kledingstuk.
          </p>
        </div>
      </header>

      <section className={styles.workspace}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>
                Nieuwe modelfoto
              </h2>
              <p className={styles.cardDescription}>
                Deze workflow wordt actief zodra de Product Studio
                betrouwbaar werkt.
              </p>
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  Artikel
                </span>
                <select className={styles.select} defaultValue="">
                  <option value="" disabled>
                    Selecteer een artikel
                  </option>
                  <option value="KN-1004">
                    KN-1004 · Merino Crewneck
                  </option>
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  Modelpreset
                </span>
                <select
                  className={styles.select}
                  defaultValue="neutral"
                >
                  <option value="neutral">
                    Neutrale studioshoot
                  </option>
                  <option value="men-fw26">
                    Heren FW26
                  </option>
                  <option value="women-ss27">
                    Dames SS27
                  </option>
                </select>
              </label>

              <label
                className={`${styles.field} ${styles.fieldFull}`}
              >
                <span className={styles.fieldLabel}>
                  Aanvullende instructie
                </span>
                <textarea
                  className={styles.textarea}
                  placeholder="Bijvoorbeeld: frontaal, rustige houding en neutrale achtergrond."
                />
              </label>
            </div>

            <div
              className={styles.notice}
              style={{ marginTop: 16 }}
            >
              Model Studio is zichtbaar in Run 1, maar wordt pas
              aangesloten nadat de packshotworkflow is afgerond.
            </div>
          </div>
        </article>

        <aside className={`${styles.card} ${styles.previewPanel}`}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>
                Modelpreview
              </h2>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.previewPlaceholder}>
              <div>
                <strong>Nog geen modelfoto</strong>
                <div>Selecteer later een packshot en modelpreset.</div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}

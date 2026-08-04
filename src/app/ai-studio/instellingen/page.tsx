import styles from "../ai-studio.module.css";

export default function AiStudioSettingsPage() {
  return (
    <>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>
            Configuratie
          </p>
          <h1 className={styles.title}>
            AI Studio-instellingen
          </h1>
          <p className={styles.description}>
            De providerinstellingen en standaardpresets worden in
            een latere run centraal opgeslagen.
          </p>
        </div>
      </header>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>
              Moduleconfiguratie
            </h2>
            <p className={styles.cardDescription}>
              Overzicht van de voorbereide AI Studio-onderdelen.
            </p>
          </div>
        </div>

        <div className={styles.cardBody}>
          <div className={styles.settingsList}>
            <div className={styles.settingRow}>
              <div>
                <strong>Beeldprovider</strong>
                <span>
                  Wordt in een volgende run gekozen en aangesloten.
                </span>
              </div>
              <div className={styles.pill}>Niet gekoppeld</div>
            </div>

            <div className={styles.settingRow}>
              <div>
                <strong>Bestandsopslag</strong>
                <span>
                  Resultaten worden later centraal in Supabase
                  Storage opgeslagen.
                </span>
              </div>
              <div className={styles.pill}>Voorbereid</div>
            </div>

            <div className={styles.settingRow}>
              <div>
                <strong>Artikelkoppeling</strong>
                <span>
                  Goedgekeurde beelden kunnen later vanuit AI
                  Studio aan artikelen worden gekoppeld.
                </span>
              </div>
              <div className={styles.pill}>Run 2</div>
            </div>

            <div className={styles.settingRow}>
              <div>
                <strong>Model Studio</strong>
                <span>
                  Wordt actief nadat de packshotworkflow stabiel is.
                </span>
              </div>
              <div className={styles.pill}>Vervolg</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

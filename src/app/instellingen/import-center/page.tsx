import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { PageHeader } from "@/components/ui/page-header";
import styles from "./import-center.module.css";

type ImportModule = {
  title: string;
  description: string;
  icon: AppIconName;
  href?: string;
  status: "ready" | "soon";
  label: string;
};

const importModules: ImportModule[] = [
  {
    title: "Artikelen importeren",
    description:
      "Importeer artikelen vanuit Excel of CSV, koppel kolommen en controleer de gegevens vóór verwerking.",
    icon: "products",
    href: "/instellingen/import-center/artikelen",
    status: "ready",
    label: "Import starten",
  },
  {
    title: "EAN-codes beheren",
    description:
      "Importeer gekochte EAN-codes en beheer straks de centrale voorraad van vrije en toegewezen codes.",
    icon: "clipboard",
    href: "/instellingen/ean-center",
    status: "ready",
    label: "EAN Center openen",
  },
  {
    title: "Klanten importeren",
    description:
      "Neem klantgegevens en adressen over uit een bestaande administratie.",
    icon: "customers",
    status: "soon",
    label: "Binnenkort",
  },
  {
    title: "Leveranciers importeren",
    description:
      "Importeer leveranciers, contactpersonen en inkoopgegevens.",
    icon: "suppliers",
    status: "soon",
    label: "Binnenkort",
  },
  {
    title: "Voorraad importeren",
    description:
      "Zet beginvoorraden en voorraad per locatie klaar voor ingebruikname.",
    icon: "inventory",
    status: "soon",
    label: "Binnenkort",
  },
  {
    title: "Prijslijsten importeren",
    description:
      "Werk klant-, kanaal- en overige verkoopprijzen bij vanuit een bestand.",
    icon: "finance",
    status: "soon",
    label: "Binnenkort",
  },
];

export default function ImportCenterPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Gegevensbeheer"
        title="Import Center"
        description="Breng bestaande gegevens gecontroleerd over naar STITCH. Artikelimport is als eerste beschikbaar."
      />

      <section className={styles.introCard}>
        <div className={styles.introIcon}>
          <AppIcon name="clipboard" size={22} />
        </div>
        <div>
          <h2>Veilig importeren in vaste stappen</h2>
          <p>
            Upload een bestand, koppel de kolommen, controleer waarschuwingen en
            voer de import pas uit nadat de preview klopt.
          </p>
        </div>
      </section>

      <section className={styles.grid} aria-label="Beschikbare imports">
        {importModules.map((module) => {
          const content = (
            <>
              <div className={styles.cardTop}>
                <span className={styles.moduleIcon}>
                  <AppIcon name={module.icon} size={20} />
                </span>
                <span
                  className={
                    module.status === "ready"
                      ? styles.readyBadge
                      : styles.soonBadge
                  }
                >
                  {module.status === "ready" ? "Beschikbaar" : "Binnenkort"}
                </span>
              </div>

              <div className={styles.cardBody}>
                <h2>{module.title}</h2>
                <p>{module.description}</p>
              </div>

              <span className={styles.cardAction}>
                {module.label}
                {module.status === "ready" && (
                  <AppIcon name="arrowRight" size={15} />
                )}
              </span>
            </>
          );

          if (module.href) {
            return (
              <Link
                key={module.title}
                href={module.href}
                className={`${styles.moduleCard} ${styles.activeCard}`}
              >
                {content}
              </Link>
            );
          }

          return (
            <article
              key={module.title}
              className={`${styles.moduleCard} ${styles.disabledCard}`}
              aria-disabled="true"
            >
              {content}
            </article>
          );
        })}
      </section>
    </div>
  );
}

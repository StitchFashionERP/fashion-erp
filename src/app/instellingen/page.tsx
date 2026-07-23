import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import styles from "./settings.module.css";

const settings = [
  {
    title: "Bedrijfsinstellingen",
    description:
      "Beheer bedrijfsgegevens, bedrijfslogo, prijsinstellingen, nummerreeksen en documenten.",
    href: "/instellingen/bedrijf",
    label: "Bedrijfslogo & gegevens",
  },
  {
    title: "STITCH-huisstijl",
    description:
      "Bekijk de vaste merk- en systeemhuisstijl van STITCH ERP Fashion Management.",
    href: "/instellingen/huisstijl",
    label: "Vaste systeemstijl",
  },
  {
    title: "Gebruikers en rechten",
    description:
      "Beheer gebruikers en eenvoudige standaardrollen.",
    href: "/instellingen/gebruikers",
    label: "Toegangsbeheer",
  },
  {
    title: "Modules",
    description:
      "Schakel optionele onderdelen zoals Productie in of uit.",
    href: "/instellingen/modules",
    label: "Modulair",
  },
  {
    title: "Voorraadlocaties",
    description:
      "Beheer magazijn-, pick-, retour- en overige voorraadlocaties.",
    href: "/instellingen/voorraadlocaties",
    label: "Warehouse",
  },
  {
    title: "Stamgegevens",
    description:
      "Beheer categorieën, kleuren en maten.",
    href: "/instellingen/stamgegevens",
    label: "Artikelen",
  },
  {
    title: "Systeemcontrole",
    description:
      "Controleer de workflow van verkoop, facturatie, retouren, inkoop en historie.",
    href: "/systeemcontrole",
    label: "Workflowcontrole",
  },
  {
    title: "Back-up en herstel",
    description:
      "Exporteer en herstel de lokale STITCH-testgegevens.",
    href: "/instellingen/backup",
    label: "Dataveiligheid",
  },
  {
    title: "Exact Online Bridge",
    description:
      "Klantensynchronisatie, compacte boekingen en betaalstatus.",
    href: "/instellingen/exact-online",
    label: "Sandbox actief",
  },
];

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Beheer"
        title="Instellingen"
        description="Beheer STITCH ERP vanuit één overzicht."
      />

      <section className={styles.grid}>
        {settings.map((setting) => (
          <Link
            key={setting.title}
            href={setting.href}
            className={`content-card ${styles.card} ${styles.clickable}`}
          >
            <h2>{setting.title}</h2>
            <p>{setting.description}</p>
            <span>{setting.label} →</span>
          </Link>
        ))}
      </section>
    </div>
  );
}

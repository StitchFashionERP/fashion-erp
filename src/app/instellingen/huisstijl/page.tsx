"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import styles from "./branding.module.css";

export default function BrandingPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Bedrijfsinstellingen"
        title="Huisstijl"
        description="STITCH ERP Fashion Management heeft een vaste systeemhuisstijl."
      />

      <section className={styles.grid}>
        <article className="content-card">
          <div className={styles.message}>
            <span>STITCH ERP</span>
            <h2>ERP FASHION MANAGEMENT</h2>
            <p>
              De naam, het systeemlogo en de interfacekleuren zijn vaste
              onderdelen van STITCH en kunnen niet door gebruikers worden
              gewijzigd.
            </p>

            <p>
              Je eigen bedrijfslogo en bedrijfsgegevens beheer je onder
              Bedrijfsinstellingen. Het logo wordt gebruikt in de
              accountweergave en op alle uitgaande documenten.
            </p>

            <Link
              href="/instellingen/bedrijf"
              className="button button-primary"
            >
              Bedrijfslogo instellen
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

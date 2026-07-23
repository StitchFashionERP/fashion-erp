import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

type ModulePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
  features: string[];
};

export function ModulePlaceholder({
  eyebrow,
  title,
  description,
  buttonLabel,
  features,
}: ModulePlaceholderProps) {
  return (
    <div>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          <button className="button button-primary" type="button">
            <span className="button-plus">+</span>
            {buttonLabel}
          </button>
        }
      />

      <section className="content-card">
        <div className="content-card-toolbar">
          <div className="table-search">
            <span>⌕</span>
            <input type="search" placeholder={`Zoeken binnen ${title.toLowerCase()}...`} />
          </div>

          <button className="button button-secondary" type="button">
            Filters
          </button>
        </div>

        <div className="empty-state">
          <div className="empty-state-icon">□</div>

          <h2>Deze module staat klaar</h2>

          <p>
            De applicatieschil werkt. In een volgende sprint koppelen we deze
            pagina aan de database en bouwen we de volledige functionaliteit.
          </p>

          <div className="feature-list">
            {features.map((feature) => (
              <div key={feature} className="feature-list-item">
                <span className="feature-list-check">✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <Link href="/" className="text-link">
            Terug naar dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}

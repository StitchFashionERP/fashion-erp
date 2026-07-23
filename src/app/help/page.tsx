"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  helpArticles,
  helpCategories,
} from "@/lib/help-content";
import styles from "./help.module.css";

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState("Alles");
  const [selectedId, setSelectedId] =
    useState(helpArticles[0].id);

  const results = useMemo(() => {
    const normalized = query
      .trim()
      .toLowerCase();

    return helpArticles.filter((article) => {
      const categoryMatches =
        category === "Alles" ||
        article.category === category;

      const queryMatches =
        !normalized ||
        [
          article.title,
          article.summary,
          article.category,
          ...article.keywords,
          ...article.steps.map(
            (step) =>
              `${step.title} ${step.description}`,
          ),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return (
        categoryMatches && queryMatches
      );
    });
  }, [category, query]);

  const selected =
    results.find(
      (article) =>
        article.id === selectedId,
    ) ||
    results[0] ||
    null;

  return (
    <div>
      <PageHeader
        eyebrow="Ondersteuning"
        title="Helpcentrum"
        description="Handleidingen, stappenplannen en antwoorden voor het volledige STITCH Fashion ERP."
      />

      <section className={styles.hero}>
        <div>
          <h2>
            Waar kunnen we je mee helpen?
          </h2>
          <p>
            Zoek op een handeling, document,
            foutmelding of onderdeel van STITCH.
          </p>
        </div>

        <div className={styles.search}>
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Bijv. creditfactuur, retour, voorraad of btw..."
          />
        </div>
      </section>

      <div className={styles.categoryRow}>
        <button
          type="button"
          className={
            category === "Alles"
              ? styles.activeCategory
              : ""
          }
          onClick={() =>
            setCategory("Alles")
          }
        >
          Alles
        </button>

        {helpCategories.map((item) => (
          <button
            key={item}
            type="button"
            className={
              category === item
                ? styles.activeCategory
                : ""
            }
            onClick={() =>
              setCategory(item)
            }
          >
            {item}
          </button>
        ))}
      </div>

      <section className={styles.layout}>
        <aside className={styles.articleList}>
          <div className={styles.resultCount}>
            {results.length} artikelen
          </div>

          {results.map((article) => (
            <button
              key={article.id}
              type="button"
              className={
                selected?.id === article.id
                  ? styles.activeArticle
                  : ""
              }
              onClick={() =>
                setSelectedId(article.id)
              }
            >
              <span>{article.category}</span>
              <strong>{article.title}</strong>
              <p>{article.summary}</p>
            </button>
          ))}

          {results.length === 0 && (
            <div className={styles.empty}>
              Geen artikelen gevonden.
            </div>
          )}
        </aside>

        <article className={styles.article}>
          {selected ? (
            <>
              <div className={styles.articleHeader}>
                <span>
                  {selected.category}
                </span>
                <h1>{selected.title}</h1>
                <p>{selected.summary}</p>

                {selected.href && (
                  <Link
                    href={selected.href}
                    className="button button-primary"
                  >
                    Open dit onderdeel
                  </Link>
                )}
              </div>

              {selected.screenshot && (
                <img
                  src={selected.screenshot}
                  alt={selected.title}
                  className={styles.screenshot}
                />
              )}

              <div className={styles.steps}>
                {selected.steps.map(
                  (step, index) => (
                    <div
                      key={`${selected.id}-${index}`}
                      className={styles.step}
                    >
                      <span>{index + 1}</span>
                      <div>
                        <h3>{step.title}</h3>
                        <p>
                          {step.description}
                        </p>
                        {step.href && (
                          <Link
                            href={step.href}
                          >
                            Open pagina →
                          </Link>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>

              {selected.tips?.length ? (
                <section
                  className={styles.tipBox}
                >
                  <h3>Tips</h3>
                  {selected.tips.map((tip) => (
                    <p key={tip}>✓ {tip}</p>
                  ))}
                </section>
              ) : null}

              {selected.warnings?.length ? (
                <section
                  className={styles.warningBox}
                >
                  <h3>Let op</h3>
                  {selected.warnings.map(
                    (warning) => (
                      <p key={warning}>
                        ! {warning}
                      </p>
                    ),
                  )}
                </section>
              ) : null}

              <section
                className={styles.mediaBox}
              >
                <div>
                  <h3>
                    Screenshots en video
                  </h3>
                  <p>
                    Deze handleiding is al
                    voorbereid op screenshots en
                    korte instructievideo’s. Voeg
                    per artikel een screenshot- of
                    video-URL toe zodra de
                    schermen definitief zijn.
                  </p>
                </div>
              </section>
            </>
          ) : (
            <div className={styles.empty}>
              Kies een artikel.
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

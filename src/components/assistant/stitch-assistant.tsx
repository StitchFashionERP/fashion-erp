"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  getHelpForPath,
} from "@/lib/help-content";
import {
  buildAssistantDataSnapshot,
} from "@/lib/stitch-assistant-data";
import {
  answerLocally,
} from "@/lib/stitch-assistant-local";
import styles from "./stitch-assistant.module.css";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  links?: Array<{
    label: string;
    href: string;
  }>;
  source?: string;
};

const suggestions = [
  "Hoe maak ik een creditfactuur?",
  "Welke facturen zijn vervallen?",
  "Welke artikelen hebben lage voorraad?",
  "Wie zijn mijn Top 10 klanten YTD?",
];

export function StitchAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: "welcome",
        role: "assistant",
        text:
          "Hoi! Ik help je met het gebruik van STITCH en met read-only vragen over de gegevens in het systeem. Ik wijzig nooit zelfstandig gegevens.",
        source: "STITCH Assistant",
      },
    ]);

  const pageHelp = useMemo(
    () => getHelpForPath(pathname),
    [pathname],
  );

  async function ask(
    value = question,
  ) {
    const trimmed = value.trim();

    if (!trimmed || loading) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);
    setQuestion("");
    setLoading(true);

    const snapshot =
      buildAssistantDataSnapshot();

    try {
      const response = await fetch(
        "/api/stitch-assistant",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            question: trimmed,
            pathname,
            snapshot,
            helpContext:
              pageHelp.slice(0, 5),
          }),
        },
      );

      const payload =
        await response.json();

      const result =
        payload.fallback
          ? answerLocally(
              trimmed,
              snapshot as any,
            )
          : payload;

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: result.answer,
          links: result.links || [],
          source: result.source,
        },
      ]);
    } catch {
      const result = answerLocally(
        trimmed,
        snapshot as any,
      );

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: result.answer,
          links: result.links,
          source: result.source,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        onClick={() =>
          setOpen((current) => !current)
        }
        aria-expanded={open}
        aria-label="STITCH Assistant openen"
      >
        <span>✦</span>
        <strong>STITCH Assistant</strong>
      </button>

      {open && (
        <aside className={styles.panel}>
          <header className={styles.header}>
            <div>
              <strong>
                STITCH Assistant
              </strong>
              <span>
                Uitleg en read-only data
              </span>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Sluiten"
            >
              ×
            </button>
          </header>

          <div className={styles.context}>
            <span>
              Hulp voor deze pagina
            </span>

            {pageHelp
              .slice(0, 3)
              .map((article) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() =>
                    ask(
                      `Hoe werkt: ${article.title}?`,
                    )
                  }
                >
                  {article.title}
                </button>
              ))}
          </div>

          <div className={styles.messages}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage
                }
              >
                <p>
                  {message.text}
                </p>

                {message.links?.length ? (
                  <div
                    className={
                      styles.messageLinks
                    }
                  >
                    {message.links.map(
                      (link) => (
                        <Link
                          key={`${message.id}-${link.href}`}
                          href={link.href}
                          onClick={() =>
                            setOpen(false)
                          }
                        >
                          {link.label} →
                        </Link>
                      ),
                    )}
                  </div>
                ) : null}

                {message.source && (
                  <small>
                    Bron: {message.source}
                  </small>
                )}
              </div>
            ))}

            {loading && (
              <div
                className={
                  styles.assistantMessage
                }
              >
                <p>Even controleren...</p>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className={styles.suggestions}>
              {suggestions.map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      ask(suggestion)
                    }
                  >
                    {suggestion}
                  </button>
                ),
              )}
            </div>
          )}

          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              ask();
            }}
          >
            <textarea
              value={question}
              onChange={(event) =>
                setQuestion(
                  event.target.value,
                )
              }
              placeholder="Stel je vraag, hoe simpel ook..."
              rows={2}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  ask();
                }
              }}
            />

            <button
              type="submit"
              disabled={
                loading ||
                !question.trim()
              }
            >
              Verstuur
            </button>
          </form>

          <footer className={styles.footer}>
            <span>
              De assistent kan alleen lezen.
            </span>
            <Link
              href="/help"
              onClick={() => setOpen(false)}
            >
              Volledig Helpcentrum
            </Link>
          </footer>
        </aside>
      )}
    </>
  );
}

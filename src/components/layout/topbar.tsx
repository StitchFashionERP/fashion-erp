"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { AppIcon } from "@/components/ui/app-icon";
import {
  appUsersChangedEvent,
  getActiveAppUser,
  type AppUser,
} from "@/lib/users";

const navigation = [
  {
    label: "Dashboard",
    href: "/",
    keywords: "dashboard overzicht cockpit",
  },
  {
    label: "Verkooporders",
    href: "/verkoop",
    keywords: "verkoop orders klanten",
  },
  {
    label: "Nieuwe verkooporder",
    href: "/verkoop/nieuw",
    keywords: "nieuwe verkooporder aanmaken",
  },
  {
    label: "Facturen",
    href: "/facturen",
    keywords: "facturen financieel openstaand",
  },
  {
    label: "Creditfacturen",
    href: "/creditfacturen",
    keywords: "credit retour financieel",
  },
  {
    label: "Debiteuren",
    href: "/debiteuren",
    keywords: "openstaande posten betalingen",
  },
  {
    label: "Inkooporders",
    href: "/inkoop",
    keywords: "inkoop leveranciers bestellingen",
  },
  {
    label: "Voorraad",
    href: "/voorraad",
    keywords: "voorraad warehouse stock",
  },
  {
    label: "Artikelen",
    href: "/artikelen",
    keywords: "artikelen producten sku",
  },
  {
    label: "Klanten",
    href: "/klanten",
    keywords: "klanten relaties",
  },
  {
    label: "Leveranciers",
    href: "/leveranciers",
    keywords: "leveranciers relaties",
  },
  {
    label: "Rapportages",
    href: "/rapportages",
    keywords: "rapportages analyses omzet",
  },
  {
    label: "Bedrijfsinstellingen",
    href: "/instellingen",
    keywords: "instellingen bedrijf beheer",
  },
  {
    label: "Helpcentrum",
    href: "/help",
    keywords:
      "help handleiding uitleg ondersteuning",
  },
];

function pageTitle(pathname: string) {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/verkoop"))
    return "Verkoop";
  if (pathname.startsWith("/facturen"))
    return "Facturen";
  if (pathname.startsWith("/creditfacturen"))
    return "Creditfacturen";
  if (pathname.startsWith("/debiteuren"))
    return "Debiteuren";
  if (pathname.startsWith("/retouren"))
    return "Retouren";
  if (pathname.startsWith("/inkoop"))
    return "Inkoop";
  if (pathname.startsWith("/voorraad"))
    return "Voorraad";
  if (pathname.startsWith("/warehouse"))
    return "Warehouse";
  if (pathname.startsWith("/artikelen"))
    return "Artikelen";
  if (pathname.startsWith("/collecties"))
    return "Collecties";
  if (pathname.startsWith("/klanten"))
    return "Klanten";
  if (pathname.startsWith("/leveranciers"))
    return "Leveranciers";
  if (pathname.startsWith("/rapportages"))
    return "Rapportages";
  if (pathname.startsWith("/supply-intelligence"))
    return "Supply Intelligence";
  if (pathname.startsWith("/instellingen"))
    return "Instellingen";
  if (pathname.startsWith("/help"))
    return "Helpcentrum";

  return "STiTch Fashion ERP";
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchInputRef =
    useRef<HTMLInputElement>(null);

  const [user, setUser] =
    useState<AppUser | null>(null);
  const [searchOpen, setSearchOpen] =
    useState(false);
  const [notificationsOpen, setNotificationsOpen] =
    useState(false);
  const [profileOpen, setProfileOpen] =
    useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function reloadUser() {
      setUser(getActiveAppUser());
    }

    reloadUser();

    window.addEventListener(
      appUsersChangedEvent,
      reloadUser,
    );
    window.addEventListener(
      "storage",
      reloadUser,
    );

    return () => {
      window.removeEventListener(
        appUsersChangedEvent,
        reloadUser,
      );
      window.removeEventListener(
        "storage",
        reloadUser,
      );
    };
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setSearchOpen(true);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleShortcut,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleShortcut,
      );
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) {
      window.setTimeout(
        () => searchInputRef.current?.focus(),
        20,
      );
    }
  }, [searchOpen]);

  const results = useMemo(() => {
    const normalized = query
      .trim()
      .toLowerCase();

    if (!normalized) {
      return navigation.slice(0, 7);
    }

    return navigation.filter((item) =>
      `${item.label} ${item.keywords}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  function toggleSidebar() {
    window.dispatchEvent(
      new CustomEvent(
        "stitch-sidebar-toggle",
      ),
    );
  }

  const displayName =
    user?.name || "Gebruiker";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <header className="topbar stitch-topbar">
        <div className="stitch-topbar-left">
          <button
            type="button"
            className="stitch-topbar-menu"
            aria-label="Menu in- of uitklappen"
            onClick={toggleSidebar}
          >
            <AppIcon name="menu" size={21} />
          </button>

          <div className="stitch-topbar-title">
            {pageTitle(pathname)}
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="topbar-icon-button"
            aria-label="Zoeken"
            onClick={() =>
              setSearchOpen(true)
            }
          >
            <AppIcon name="search" size={19} />
          </button>

          <div className="topbar-popover-anchor">
            <button
              type="button"
              className="topbar-icon-button topbar-notification"
              aria-label="Meldingen"
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen(
                  (current) => !current,
                );
                setProfileOpen(false);
              }}
            >
              <AppIcon name="bell" size={19} />
              <span className="notification-badge">
                3
              </span>
            </button>

            {notificationsOpen && (
              <div className="topbar-popover topbar-notifications">
                <div className="topbar-popover-title">
                  Meldingen
                </div>

                <Link
                  href="/facturen"
                  onClick={() =>
                    setNotificationsOpen(false)
                  }
                >
                  <strong>
                    Controleer openstaande facturen
                  </strong>
                  <span>
                    Bekijk betalingen en vervaldata.
                  </span>
                </Link>

                <Link
                  href="/inkoop"
                  onClick={() =>
                    setNotificationsOpen(false)
                  }
                >
                  <strong>
                    Verwachte leveringen
                  </strong>
                  <span>
                    Bekijk openstaande inkooporders.
                  </span>
                </Link>

                <Link
                  href="/systeemcontrole"
                  onClick={() =>
                    setNotificationsOpen(false)
                  }
                >
                  <strong>
                    Systeemcontrole
                  </strong>
                  <span>
                    Controleer de volledige workflow.
                  </span>
                </Link>
              </div>
            )}
          </div>

          <button
            type="button"
            className="topbar-icon-button"
            aria-label="Helpcentrum"
            title="Helpcentrum"
            aria-current={
              pathname.startsWith("/help")
                ? "page"
                : undefined
            }
            onClick={() => {
              setSearchOpen(false);
              setNotificationsOpen(false);
              setProfileOpen(false);
              setQuery("");

              if (
                !pathname.startsWith("/help")
              ) {
                router.push("/help");
              }
            }}
          >
            <AppIcon name="help" size={19} />
          </button>

          <div className="topbar-divider" />

          <div className="topbar-popover-anchor">
            <button
              className="topbar-profile"
              type="button"
              aria-expanded={profileOpen}
              onClick={() => {
                setProfileOpen(
                  (current) => !current,
                );
                setNotificationsOpen(false);
              }}
            >
              <div className="topbar-profile-avatar">
                {initials || "U"}
              </div>

              <div className="topbar-profile-text">
                <span className="topbar-profile-name">
                  {displayName}
                </span>
                <span className="topbar-profile-role">
                  {user?.role || "Gebruiker"}
                </span>
              </div>

              <AppIcon
                name="chevronDown"
                size={15}
              />
            </button>

            {profileOpen && (
              <div className="topbar-popover topbar-profile-menu">
                <div className="topbar-user-summary">
                  <div className="topbar-user-large-avatar">
                    {initials || "U"}
                  </div>
                  <div>
                    <strong>{displayName}</strong>
                    <span>
                      {user?.email ||
                        user?.role ||
                        "Gebruiker"}
                    </span>
                  </div>
                </div>

                <Link
                  href="/instellingen/gebruikers"
                  onClick={() =>
                    setProfileOpen(false)
                  }
                >
                  Gebruikers en rechten
                </Link>

                <Link
                  href="/instellingen/bedrijf"
                  onClick={() =>
                    setProfileOpen(false)
                  }
                >
                  Bedrijfsinstellingen
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {searchOpen && (
        <div
          className="stitch-command-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSearchOpen(false);
            }
          }}
        >
          <section
            className="stitch-command"
            role="dialog"
            aria-modal="true"
            aria-label="Zoeken in STITCH"
          >
            <div className="stitch-command-input">
              <AppIcon
                name="search"
                size={19}
              />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Zoek een onderdeel..."
              />
              <kbd>ESC</kbd>
            </div>

            <div className="stitch-command-results">
              {results.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery("");
                  }}
                >
                  <span>{item.label}</span>
                  <AppIcon
                    name="arrowRight"
                    size={15}
                  />
                </Link>
              ))}

              {results.length === 0 && (
                <div className="stitch-command-empty">
                  Geen resultaten gevonden.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

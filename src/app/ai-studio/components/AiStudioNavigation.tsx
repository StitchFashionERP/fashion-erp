"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../ai-studio.module.css";

const links = [
  {
    href: "/ai-studio",
    label: "Overzicht",
    exact: true,
  },
  {
    href: "/ai-studio/workspace",
    label: "Workspace",
  },
  {
    href: "/ai-studio/model-studio",
    label: "Model Studio",
  },
  {
    href: "/ai-studio/referenties",
    label: "Referenties",
  },
  {
    href: "/ai-studio/bibliotheek",
    label: "Bibliotheek",
  },
  {
    href: "/ai-studio/instellingen",
    label: "Instellingen",
  },
];

export function AiStudioNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className={styles.moduleNavigation}
      aria-label="AI Studio navigatie"
    >
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href ||
            pathname.startsWith(`${link.href}/`) ||
            (
              link.href === "/ai-studio/workspace" &&
              pathname.startsWith(
                "/ai-studio/product-studio",
              )
            );

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.moduleLink} ${
              active ? styles.moduleLinkActive : ""
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

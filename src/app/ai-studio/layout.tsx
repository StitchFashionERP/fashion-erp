import type { ReactNode } from "react";
import { AiStudioNavigation } from "./components/AiStudioNavigation";
import styles from "./ai-studio.module.css";

export default function AiStudioLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <AiStudioNavigation />
      {children}
    </div>
  );
}

import styles from "./workspace-components.module.css";

export function WorkspaceNotice() {
  return (
    <aside className={styles.notice}>
      <strong>Originele bronfoto blijft bewaard</strong>

      <p>
        STiTch overschrijft het originele bestand nooit.
        Een HEIC- of HEIF-bestand wordt alleen voor de
        AI-verwerking naar een aparte PNG-versie omgezet.
      </p>
    </aside>
  );
}

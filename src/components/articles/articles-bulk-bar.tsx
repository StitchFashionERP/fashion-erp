"use client";

type ArticlesBulkBarProps = {
  selectedCount: number;
  onEdit: () => void;
  onExport: () => void;
  onArchive: () => void;
  onClear: () => void;
};

export function ArticlesBulkBar({
  selectedCount,
  onEdit,
  onExport,
  onArchive,
  onClear,
}: ArticlesBulkBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 18px",
        borderTop: "1px solid #dbe3ee",
        borderBottom: "1px solid #dbe3ee",
        background: "#f7f9fc",
      }}
    >
      <strong style={{ fontSize: 15 }}>
        {selectedCount}{" "}
        {selectedCount === 1 ? "artikel geselecteerd" : "artikelen geselecteerd"}
      </strong>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          className="button button-primary"
          onClick={onEdit}
        >
          Bulk wijzigen
        </button>
        <button type="button" className="button" onClick={onExport}>
          Exporteren
        </button>
        <button type="button" className="button" onClick={onArchive}>
          Archiveren
        </button>
        <button type="button" className="text-button" onClick={onClear}>
          Wissen
        </button>
      </div>
    </div>
  );
}

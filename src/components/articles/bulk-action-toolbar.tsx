"use client";

type BulkActionToolbarProps = {
  selectedCount: number;
  onEdit: () => void;
  onExport: () => void;
  onArchive: () => void;
  onClear: () => void;
};

export function BulkActionToolbar({
  selectedCount,
  onEdit,
  onExport,
  onArchive,
  onClear,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Bulkacties"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
        padding: "12px 16px",
        margin: "0 0 16px",
        border: "1px solid var(--border-color, #d9dde3)",
        borderRadius: "8px",
        background: "var(--surface-muted, #f7f8fa)",
      }}
    >
      <div>
        <strong>
          {selectedCount}{" "}
          {selectedCount === 1 ? "artikel" : "artikelen"} geselecteerd
        </strong>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className="button button-primary"
          onClick={onEdit}
        >
          Bulk aanpassen
        </button>

        <button
          type="button"
          className="button"
          onClick={onExport}
        >
          Exporteren
        </button>

        <button
          type="button"
          className="button"
          onClick={onArchive}
        >
          Verwijderen
        </button>

        <button
          type="button"
          className="text-button"
          onClick={onClear}
        >
          Selectie wissen
        </button>
      </div>
    </div>
  );
}
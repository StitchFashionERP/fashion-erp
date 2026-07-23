"use client";

type Props = {
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
}: Props) {
  if (!selectedCount) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 12px",
        borderTop: "1px solid #dbe3ee",
        borderBottom: "1px solid #dbe3ee",
        background: "#f7f9fc",
      }}
    >
      <strong>{selectedCount} geselecteerd</strong>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" className="button button-primary" onClick={onEdit}>
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

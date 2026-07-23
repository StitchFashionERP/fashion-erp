export type ExactSyncStatus =
  | "NOT_READY"
  | "PENDING"
  | "SYNCED"
  | "ERROR";

export interface ExactSyncRecord {
  status: ExactSyncStatus;
  exactTransactionId?: string;
  syncedAt?: string;
  errorMessage?: string;
}

export function getExactStatusLabel(
  status: ExactSyncStatus
) {
  switch (status) {
    case "NOT_READY":
      return "Niet gekoppeld";

    case "PENDING":
      return "Klaar voor Exact";

    case "SYNCED":
      return "Gesynchroniseerd";

    case "ERROR":
      return "Fout";

    default:
      return "Onbekend";
  }
}
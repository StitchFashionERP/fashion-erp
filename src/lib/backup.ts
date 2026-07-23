"use client";

export type StitchBackup = {
  version: 1;
  createdAt: string;
  entries: Record<string, string>;
};

export function createStitchBackup() {
  const entries: Record<string, string> = {};

  for (
    let index = 0;
    index < window.localStorage.length;
    index += 1
  ) {
    const key = window.localStorage.key(index);

    if (
      key &&
      (key.startsWith("stitch-erp") ||
        key.startsWith("fashion-erp"))
    ) {
      entries[key] =
        window.localStorage.getItem(key) || "";
    }
  }

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    entries,
  } satisfies StitchBackup;
}

export function downloadStitchBackup() {
  const backup = createStitchBackup();
  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" },
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `stitch-backup-${backup.createdAt.slice(
    0,
    10,
  )}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function restoreStitchBackup(
  file: File,
) {
  const text = await file.text();
  const backup = JSON.parse(text) as StitchBackup;

  if (
    backup.version !== 1 ||
    !backup.entries
  ) {
    throw new Error(
      "Dit is geen geldige STITCH-back-up.",
    );
  }

  Object.entries(backup.entries).forEach(
    ([key, value]) =>
      window.localStorage.setItem(
        key,
        value,
      ),
  );

  window.location.reload();
}

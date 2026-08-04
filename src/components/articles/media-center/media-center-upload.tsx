"use client";

import {
  type ChangeEvent,
  type DragEvent,
  useRef,
  useState,
} from "react";

type UploadedMedia = {
  asset: {
    id: string;
    name: string;
  };
  signedUrl: string | null;
  convertedFromHeic: boolean;
};

type Props = {
  productId: string;
  makePrimary?: boolean;
  onUploaded?: (media: UploadedMedia) => void;
  onMessage?: (message: string) => void;
};

const acceptedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const maxFileSize = 25 * 1024 * 1024;

function readErrorMessage(
  body: unknown,
  fallback: string,
) {
  if (
    body &&
    typeof body === "object" &&
    "error" in body
  ) {
    return String(
      (body as { error?: unknown }).error ?? fallback,
    );
  }

  return fallback;
}

export function MediaCenterUpload({
  productId,
  makePrimary = false,
  onUploaded,
  onMessage,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadFile(file: File) {
    setError("");

    if (!acceptedTypes.has(file.type)) {
      setError(
        "Gebruik een JPG-, PNG-, WebP-, HEIC- of HEIF-afbeelding.",
      );
      return;
    }

    if (
      file.size === 0 ||
      file.size > maxFileSize
    ) {
      setError(
        "De afbeelding mag maximaal 25 MB groot zijn.",
      );
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();

      formData.set("productId", productId);
      formData.set("category", "PACKSHOT");
      formData.set(
        "makePrimary",
        makePrimary ? "true" : "false",
      );
      formData.set("file", file);

      const response = await fetch(
        "/api/media/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      const body = (await response
        .json()
        .catch(() => null)) as
        | UploadedMedia
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          readErrorMessage(
            body,
            "Uploaden is mislukt.",
          ),
        );
      }

      if (
        !body ||
        typeof body !== "object" ||
        !("asset" in body)
      ) {
        throw new Error(
          "De upload-API heeft een ongeldig resultaat teruggestuurd.",
        );
      }

      const uploaded = body as UploadedMedia;

      onUploaded?.(uploaded);

      onMessage?.(
        uploaded.convertedFromHeic
          ? "Afbeelding toegevoegd. HEIC is automatisch naar PNG omgezet."
          : "Afbeelding toegevoegd aan Media Center.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Uploaden is mislukt.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleInput(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (file) {
      void uploadFile(file);
    }

    event.target.value = "";
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      void uploadFile(file);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
        hidden
        onChange={handleInput}
      />

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        style={{
          border: isDragging
            ? "1px solid var(--primary)"
            : "1px dashed var(--border)",
          borderRadius: 6,
          background: isDragging
            ? "var(--primary-light)"
            : "var(--surface-muted)",
          padding: 18,
          textAlign: "center",
        }}
      >
        <strong style={{ display: "block", fontSize: 12 }}>
          Upload naar Media Center
        </strong>

        <span
          style={{
            display: "block",
            marginTop: 4,
            color: "var(--text-secondary)",
            fontSize: 10,
          }}
        >
          JPG, PNG, WebP, HEIC of HEIF · maximaal 25 MB
        </span>

        <button
          type="button"
          className="button button-primary"
          style={{ marginTop: 12 }}
          onClick={() =>
            inputRef.current?.click()
          }
          disabled={isUploading}
        >
          {isUploading
            ? "Uploaden..."
            : "+ Afbeelding toevoegen"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 8,
            border: "1px solid #e1b3b3",
            borderRadius: 5,
            background: "var(--danger-light)",
            padding: "10px 12px",
            color: "var(--danger)",
            fontSize: 11,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

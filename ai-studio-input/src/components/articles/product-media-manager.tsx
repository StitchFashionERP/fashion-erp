"use client";

import { useRef, useState } from "react";
import {
  addProductMedia,
  deleteProductMedia,
  getProductMedia,
  setPrimaryProductMedia,
  updateProductMediaType,
  type ProductMedia,
  type ProductMediaType,
} from "@/lib/product-media";
import styles from "./product-media-manager.module.css";

type Props = {
  productId: string;
  productName: string;
  onMessage?: (message: string) => void;
};

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 4 * 1024 * 1024;

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Kon ${file.name} niet lezen.`));
    reader.readAsDataURL(file);
  });
}

export function ProductMediaManager({
  productId,
  productName,
  onMessage,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<ProductMedia[]>(() => getProductMedia(productId));
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const initial = getProductMedia(productId);
    return initial.find((item) => item.isPrimary)?.id ?? initial[0]?.id ?? null;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = media.find((item) => item.id === selectedId)
    ?? media.find((item) => item.isPrimary)
    ?? media[0]
    ?? null;

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const invalidType = files.find((file) => !acceptedTypes.includes(file.type));
    if (invalidType) {
      setError("Gebruik alleen JPG, PNG of WEBP.");
      return;
    }

    const tooLarge = files.find((file) => file.size > maxFileSize);
    if (tooLarge) {
      setError(`${tooLarge.name} is groter dan 4 MB.`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const converted = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          dataUrl: await readFile(file),
          mimeType: file.type,
        })),
      );

      const updated = addProductMedia(productId, converted);
      setMedia(updated);
      setSelectedId(updated[updated.length - files.length]?.id ?? updated[0]?.id ?? null);
      onMessage?.(`${files.length} afbeelding${files.length === 1 ? "" : "en"} toegevoegd.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Uploaden is niet gelukt.");
    } finally {
      setIsUploading(false);
    }
  }

  function makePrimary(mediaId: string) {
    const updated = setPrimaryProductMedia(productId, mediaId);
    setMedia(updated);
    setSelectedId(mediaId);
    onMessage?.("Hoofdafbeelding bijgewerkt.");
  }

  function remove(mediaId: string) {
    if (!window.confirm("Deze afbeelding verwijderen?")) return;
    const updated = deleteProductMedia(productId, mediaId);
    setMedia(updated);
    setSelectedId(updated.find((item) => item.isPrimary)?.id ?? updated[0]?.id ?? null);
    onMessage?.("Afbeelding verwijderd.");
  }

  function changeType(type: ProductMediaType) {
    if (!selected) return;
    setMedia(updateProductMediaType(productId, selected.id, type));
  }

  return (
    <div className={styles.manager}>
      <input
        ref={inputRef}
        className={styles.hiddenInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(event) => {
          if (event.target.files) void handleFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      <div
        className={`${styles.stage} ${isDragging ? styles.stageDragging : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
      >
        {selected ? (
          <img src={selected.dataUrl} alt={`${productName} - ${selected.name}`} />
        ) : (
          <button
            type="button"
            className={styles.emptyState}
            onClick={() => inputRef.current?.click()}
          >
            <span className={styles.uploadIcon}>＋</span>
            <strong>Productfoto toevoegen</strong>
            <span>Sleep een afbeelding hierheen of klik om te kiezen</span>
            <small>JPG, PNG of WEBP · maximaal 4 MB</small>
          </button>
        )}

        {selected?.isPrimary && <span className={styles.primaryBadge}>Hoofdafbeelding</span>}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.toolbar}>
        <button
          type="button"
          className="button button-primary"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? "Uploaden..." : "+ Afbeeldingen"}
        </button>

        {selected && !selected.isPrimary && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => makePrimary(selected.id)}
          >
            Maak hoofdafbeelding
          </button>
        )}
      </div>

      {media.length > 0 && (
        <div className={styles.gallery}>
          {media.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.thumbnail} ${item.id === selected?.id ? styles.thumbnailActive : ""}`}
              onClick={() => setSelectedId(item.id)}
              aria-label={item.name}
            >
              <img src={item.dataUrl} alt="" />
              {item.isPrimary && <span>★</span>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className={styles.metaPanel}>
          <div>
            <strong>{selected.name}</strong>
            <span>{media.length} afbeelding{media.length === 1 ? "" : "en"}</span>
          </div>

          <label>
            <span>Type</span>
            <select value={selected.type} onChange={(event) => changeType(event.target.value as ProductMediaType)}>
              <option value="packshot">Packshot</option>
              <option value="detail">Detail</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="campaign">Campagne</option>
            </select>
          </label>

          <button type="button" className={styles.deleteButton} onClick={() => remove(selected.id)}>
            Verwijderen
          </button>
        </div>
      )}

      <div className={styles.aiPanel}>
        <div>
          <strong>AI Creative Studio</strong>
          <span>Binnenkort beschikbaar voor deze afbeeldingen.</span>
        </div>
        <div>
          <button type="button" disabled>Achtergrond verwijderen</button>
          <button type="button" disabled>Packshot verbeteren</button>
          <button type="button" disabled>Modelfoto maken</button>
        </div>
      </div>
    </div>
  );
}

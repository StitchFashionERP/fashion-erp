"use client";

import { useState } from "react";
import { MediaCenterProductPreview } from "./media-center/media-center-product-preview";
import { MediaCenterUpload } from "./media-center/media-center-upload";
import { MediaCenterGallery } from "./media-center/media-center-gallery";
import styles from "./product-media-manager.module.css";

type Props = {
  productId: string;
  productName: string;
  onMessage?: (message: string) => void;
};

export function ProductMediaManager({
  productId,
  productName,
  onMessage,
}: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState("");

  function handleMessage(nextMessage: string) {
    setMessage(nextMessage);
    onMessage?.(nextMessage);
  }

  return (
    <div className={styles.manager}>
      <MediaCenterProductPreview
        key={`${productId}-${refreshKey}`}
        productId={productId}
        productName={productName}
      />

      <MediaCenterGallery
        productId={productId}
      />

      <MediaCenterUpload
        productId={productId}
        makePrimary
        onUploaded={() => {
          setRefreshKey((current) => current + 1);
        }}
        onMessage={handleMessage}
      />

      {message && (
        <div
          style={{
            border: "1px solid #a8d2b9",
            borderRadius: 5,
            background: "var(--success-light)",
            padding: "10px 12px",
            color: "var(--success)",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

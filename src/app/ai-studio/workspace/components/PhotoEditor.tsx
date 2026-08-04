"use client";

import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  clampOffset,
  createEditedFile,
  DEFAULT_PHOTO_EDITOR_TRANSFORM,
  exportEditedImage,
  getCoverScale,
  normalizeRotation,
  type PhotoEditorTransform,
} from "@/lib/media/photo-editor";
import styles from "./photo-editor.module.css";

type PhotoEditorProps = {
  sourceUrl: string;
  sourceFileName: string;
  disabled?: boolean;
  onSave: (
    file: File,
    transform: PhotoEditorTransform,
  ) => Promise<void> | void;
};

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startOffsetX: number;
  startOffsetY: number;
} | null;

export function PhotoEditor({
  sourceUrl,
  sourceFileName,
  disabled = false,
  onSave,
}: PhotoEditorProps) {
  const frameRef = useRef<HTMLDivElement | null>(
    null,
  );
  const imageRef = useRef<HTMLImageElement | null>(
    null,
  );

  const [transform, setTransform] =
    useState<PhotoEditorTransform>(
      DEFAULT_PHOTO_EDITOR_TRANSFORM,
    );

  const [imageSize, setImageSize] = useState({
    width: 0,
    height: 0,
  });

  const [frameSize, setFrameSize] = useState({
    width: 0,
    height: 0,
  });

  const [dragState, setDragState] =
    useState<DragState>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTransform(
      DEFAULT_PHOTO_EDITOR_TRANSFORM,
    );
    setError("");
  }, [sourceUrl]);

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const updateSize = () => {
      const rect =
        frame.getBoundingClientRect();

      setFrameSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(frame);

    return () => {
      observer.disconnect();
    };
  }, []);

  const coverScale = useMemo(() => {
    if (
      imageSize.width <= 0 ||
      imageSize.height <= 0 ||
      frameSize.width <= 0 ||
      frameSize.height <= 0
    ) {
      return 1;
    }

    return getCoverScale(
      imageSize.width,
      imageSize.height,
      frameSize.width,
      frameSize.height,
      transform.rotation,
    );
  }, [
    frameSize.height,
    frameSize.width,
    imageSize.height,
    imageSize.width,
    transform.rotation,
  ]);

  const renderedTransform = useMemo(
    () => {
      const scale =
        coverScale * transform.zoom;

      return [
        "translate(-50%, -50%)",
        `translate(${transform.offsetX}px, ${transform.offsetY}px)`,
        `rotate(${transform.rotation}deg)`,
        `scale(${scale})`,
      ].join(" ");
    },
    [
      coverScale,
      transform.offsetX,
      transform.offsetY,
      transform.rotation,
      transform.zoom,
    ],
  );

  function clampCurrentTransform(
    next: PhotoEditorTransform,
  ) {
    if (
      imageSize.width <= 0 ||
      imageSize.height <= 0 ||
      frameSize.width <= 0 ||
      frameSize.height <= 0
    ) {
      return next;
    }

    const clamped = clampOffset(
      next.offsetX,
      next.offsetY,
      {
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
        frameWidth: frameSize.width,
        frameHeight: frameSize.height,
        rotation: next.rotation,
        zoom: next.zoom,
      },
    );

    return {
      ...next,
      ...clamped,
    };
  }

  function rotate(delta: number) {
    setTransform((current) =>
      clampCurrentTransform({
        ...current,
        rotation: normalizeRotation(
          current.rotation + delta,
        ),
        offsetX: 0,
        offsetY: 0,
      }),
    );
  }

  function setZoom(value: number) {
    setTransform((current) =>
      clampCurrentTransform({
        ...current,
        zoom: Math.max(
          1,
          Math.min(3, value),
        ),
      }),
    );
  }

  function reset() {
    setTransform(
      DEFAULT_PHOTO_EDITOR_TRANSFORM,
    );
    setError("");
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (disabled || saving) {
      return;
    }

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    setDragState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: transform.offsetX,
      startOffsetY: transform.offsetY,
    });
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (
      !dragState ||
      dragState.pointerId !== event.pointerId
    ) {
      return;
    }

    const nextOffsetX =
      dragState.startOffsetX +
      event.clientX -
      dragState.startClientX;

    const nextOffsetY =
      dragState.startOffsetY +
      event.clientY -
      dragState.startClientY;

    setTransform((current) =>
      clampCurrentTransform({
        ...current,
        offsetX: nextOffsetX,
        offsetY: nextOffsetY,
      }),
    );
  }

  function stopDragging(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (
      dragState?.pointerId === event.pointerId
    ) {
      if (
        event.currentTarget.hasPointerCapture(
          event.pointerId,
        )
      ) {
        event.currentTarget.releasePointerCapture(
          event.pointerId,
        );
      }

      setDragState(null);
    }
  }

  async function save() {
    const image = imageRef.current;

    if (!image) {
      setError(
        "De bronafbeelding is nog niet geladen.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      /*
       * De editor exporteert op 1600 × 2000 pixels.
       * Dat is ruim voldoende voor productpackshots
       * en voorkomt extreem grote iPhone-bitmaps.
       */
      const blob = await exportEditedImage({
        image,
        frameWidth: 1600,
        frameHeight: 2000,
        transform: {
          ...transform,
          offsetX:
            frameSize.width > 0
              ? transform.offsetX *
                (1600 / frameSize.width)
              : 0,
          offsetY:
            frameSize.height > 0
              ? transform.offsetY *
                (2000 / frameSize.height)
              : 0,
        },
        mimeType: "image/png",
        quality: 0.95,
      });

      const file = createEditedFile(
        blob,
        sourceFileName,
      );

      await onSave(file, transform);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De afbeelding kon niet worden opgeslagen.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.editor}>
      <div
        ref={frameRef}
        className={`${styles.frame} ${
          dragState
            ? styles.frameDragging
            : ""
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={sourceUrl}
          alt="Bronfoto bewerken"
          className={styles.image}
          draggable={false}
          style={{
            width: imageSize.width || "auto",
            height: imageSize.height || "auto",
            transform: renderedTransform,
          }}
          onLoad={(event) => {
            const image =
              event.currentTarget;

            setImageSize({
              width: image.naturalWidth,
              height: image.naturalHeight,
            });
          }}
        />

        <div className={styles.grid} />

        <span className={styles.frameHint}>
          Sleep de foto om het product centraal te
          plaatsen
        </span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.button}
            onClick={() => rotate(-90)}
            disabled={disabled || saving}
          >
            ↺ Linksom
          </button>

          <button
            type="button"
            className={styles.button}
            onClick={() => rotate(90)}
            disabled={disabled || saving}
          >
            ↻ Rechtsom
          </button>

          <button
            type="button"
            className={styles.button}
            onClick={reset}
            disabled={disabled || saving}
          >
            Resetten
          </button>
        </div>

        <div className={styles.zoomControl}>
          <label htmlFor="photo-editor-zoom">
            Zoomen
          </label>

          <input
            id="photo-editor-zoom"
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={transform.zoom}
            disabled={disabled || saving}
            onChange={(event) =>
              setZoom(
                Number(event.target.value),
              )
            }
          />

          <span className={styles.zoomValue}>
            {Math.round(
              transform.zoom * 100,
            )}
            %
          </span>
        </div>

        <p className={styles.message}>
          De bewerkte foto wordt opgeslagen als
          nieuwe bron voor de AI-packshot.
        </p>

        {error && (
          <p className={styles.error}>
            {error}
          </p>
        )}

        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void save()}
            disabled={disabled || saving}
          >
            {saving
              ? "Bewerking opslaan..."
              : "Bewerking opslaan"}
          </button>
        </div>
      </div>
    </section>
  );
}

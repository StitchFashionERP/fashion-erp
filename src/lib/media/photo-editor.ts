export type PhotoEditorTransform = {
  rotation: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export type ExportEditedImageOptions = {
  image: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
  transform: PhotoEditorTransform;
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
  quality?: number;
  background?: string | null;
};

export const DEFAULT_PHOTO_EDITOR_TRANSFORM: PhotoEditorTransform = {
  rotation: 0,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

export function normalizeRotation(value: number) {
  const normalized = value % 360;
  return normalized < 0
    ? normalized + 360
    : normalized;
}

export function getRotatedImageDimensions(
  width: number,
  height: number,
  rotation: number,
) {
  const normalized = normalizeRotation(rotation);

  if (normalized === 90 || normalized === 270) {
    return {
      width: height,
      height: width,
    };
  }

  return {
    width,
    height,
  };
}

export function getCoverScale(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  rotation: number,
) {
  const rotated = getRotatedImageDimensions(
    imageWidth,
    imageHeight,
    rotation,
  );

  return Math.max(
    frameWidth / rotated.width,
    frameHeight / rotated.height,
  );
}

export function clampOffset(
  offsetX: number,
  offsetY: number,
  options: {
    imageWidth: number;
    imageHeight: number;
    frameWidth: number;
    frameHeight: number;
    rotation: number;
    zoom: number;
  },
) {
  const rotated = getRotatedImageDimensions(
    options.imageWidth,
    options.imageHeight,
    options.rotation,
  );

  const coverScale = getCoverScale(
    options.imageWidth,
    options.imageHeight,
    options.frameWidth,
    options.frameHeight,
    options.rotation,
  );

  const scale = coverScale * options.zoom;

  const renderedWidth = rotated.width * scale;
  const renderedHeight = rotated.height * scale;

  const maxOffsetX = Math.max(
    0,
    (renderedWidth - options.frameWidth) / 2,
  );

  const maxOffsetY = Math.max(
    0,
    (renderedHeight - options.frameHeight) / 2,
  );

  return {
    offsetX: Math.max(
      -maxOffsetX,
      Math.min(maxOffsetX, offsetX),
    ),
    offsetY: Math.max(
      -maxOffsetY,
      Math.min(maxOffsetY, offsetY),
    ),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error(
              "De bewerkte afbeelding kon niet worden aangemaakt.",
            ),
          );
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

export async function exportEditedImage({
  image,
  frameWidth,
  frameHeight,
  transform,
  mimeType = "image/png",
  quality = 0.95,
  background = null,
}: ExportEditedImageOptions) {
  if (
    image.naturalWidth <= 0 ||
    image.naturalHeight <= 0
  ) {
    throw new Error(
      "De bronafbeelding is nog niet volledig geladen.",
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(frameWidth));
  canvas.height = Math.max(1, Math.round(frameHeight));

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "De browser ondersteunt deze afbeeldingsbewerking niet.",
    );
  }

  if (background) {
    context.fillStyle = background;
    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );
  } else {
    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }

  const coverScale = getCoverScale(
    image.naturalWidth,
    image.naturalHeight,
    frameWidth,
    frameHeight,
    transform.rotation,
  );

  const scale = coverScale * transform.zoom;

  context.save();

  context.translate(
    frameWidth / 2 + transform.offsetX,
    frameHeight / 2 + transform.offsetY,
  );

  context.rotate(
    (normalizeRotation(transform.rotation) *
      Math.PI) /
      180,
  );

  context.scale(scale, scale);

  context.drawImage(
    image,
    -image.naturalWidth / 2,
    -image.naturalHeight / 2,
  );

  context.restore();

  return canvasToBlob(
    canvas,
    mimeType,
    quality,
  );
}

export function createEditedFile(
  blob: Blob,
  originalName: string,
) {
  const baseName =
    originalName
      .replace(/\.[^.]+$/, "")
      .trim() || "bronfoto";

  const extension =
    blob.type === "image/jpeg"
      ? "jpg"
      : blob.type === "image/webp"
        ? "webp"
        : "png";

  return new File(
    [blob],
    `${baseName}-bewerkt.${extension}`,
    {
      type: blob.type,
      lastModified: Date.now(),
    },
  );
}

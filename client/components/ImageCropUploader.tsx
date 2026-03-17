import React, { useRef, useState, useCallback, type ReactNode } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Crop as CropIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  ImagePlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

async function getCroppedImageFile(
  imageEl: HTMLImageElement,
  pixelCrop: PixelCrop,
  scale: number,
  fileName: string,
  mimeType: string,
): Promise<File> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  const scaleX = (imageEl.naturalWidth / imageEl.width) * scale;
  const scaleY = (imageEl.naturalHeight / imageEl.height) * scale;

  // Output at 2× for retina quality, capped at 800 px
  const outputSize = Math.min(pixelCrop.width * scaleX, 800);
  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    imageEl,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Canvas toBlob failed"));
        resolve(new File([blob], fileName, { type: mimeType }));
      },
      mimeType,
      0.92,
    );
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageCropUploaderProps {
  /** Called with the final cropped File when the user confirms. */
  onUpload: (file: File) => Promise<void> | void;
  /** Aspect ratio. Defaults to 1 (square/circle). */
  aspect?: number;
  /** Render a circular crop overlay. Defaults to true. */
  circularCrop?: boolean;
  /** Max file size in MB before rejecting. Defaults to 10. */
  maxSizeMB?: number;
  /** Accepted MIME types. Defaults to jpeg, png, webp. */
  accept?: string;
  /** Custom trigger element. If omitted a default button is rendered. */
  children?: ReactNode;
  /** Additional class for the trigger wrapper. */
  className?: string;
  /** Whether the upload action is currently in progress (shows spinner on confirm). */
  uploading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ImageCropUploader: React.FC<ImageCropUploaderProps> = ({
  onUpload,
  aspect = 1,
  circularCrop = true,
  maxSizeMB = 10,
  accept = "image/jpeg,image/png,image/webp",
  children,
  className,
  uploading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [open, setOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>("");
  const [fileName, setFileName] = useState("avatar.jpg");
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // ── File selection ──────────────────────────────────────────────────────────

  const openFilePicker = () => {
    if (uploading || confirming) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File exceeds ${maxSizeMB} MB limit.`);
      return;
    }

    setFileName(file.name);
    setMimeType(file.type || "image/jpeg");

    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(reader.result as string);
      setScale(1);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setOpen(true);
    };
    reader.readAsDataURL(file);

    // reset so same file can be re-selected
    e.target.value = "";
  };

  // ── Image load ──────────────────────────────────────────────────────────────

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    },
    [aspect],
  );

  // ── Confirm ─────────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop) return;
    setConfirming(true);
    try {
      const file = await getCroppedImageFile(
        imgRef.current,
        completedCrop,
        scale,
        fileName,
        mimeType,
      );
      await onUpload(file);
      setOpen(false);
    } catch {
      setError("Failed to process the image. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    if (confirming || uploading) return;
    setOpen(false);
    setImgSrc("");
    setError(null);
  };

  const isProcessing = confirming || uploading;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Trigger */}
      <span
        className={cn("cursor-pointer", className)}
        onClick={openFilePicker}
      >
        {children ?? (
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <ImagePlus className="h-4 w-4" />
            Upload photo
          </Button>
        )}
      </span>

      {/* Error outside dialog (e.g. file-too-large before dialog opens) */}
      {error && !open && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}

      {/* Crop dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
          {/* Header */}
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <CropIcon className="h-4 w-4 text-primary" />
              Crop your photo
            </DialogTitle>
          </DialogHeader>

          {/* Crop area */}
          <div className="relative bg-[hsl(var(--muted))] flex items-center justify-center overflow-hidden min-h-[280px] max-h-[380px]">
            {imgSrc ? (
              <ReactCrop
                crop={crop}
                onChange={(_, pct) => setCrop(pct)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                circularCrop={circularCrop}
                minWidth={60}
                minHeight={60}
                className="max-h-[380px]"
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop preview"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "center",
                  }}
                  onLoad={onImageLoad}
                  className="max-h-[380px] max-w-full object-contain transition-transform duration-150"
                />
              </ReactCrop>
            ) : (
              <div className="flex items-center justify-center h-64 w-full">
                <Upload className="h-8 w-8 text-muted-foreground animate-pulse" />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="px-5 py-4 space-y-4 border-t border-border bg-card">
            {/* Zoom */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)))
                }
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <Slider
                value={[scale]}
                min={0.5}
                max={3}
                step={0.05}
                onValueChange={([v]) => setScale(v)}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() =>
                  setScale((s) => Math.min(3, +(s + 0.1).toFixed(2)))
                }
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setScale(1)}
                title="Reset zoom"
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Hint */}
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Drag the crop area to reposition &bull; Use the slider to zoom
            </p>

            {/* In-dialog error */}
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-5 py-4 bg-card border-t border-border flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing || !completedCrop}
              className="flex-1 sm:flex-none gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Apply photo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageCropUploader;

/**
 * PDFSigningViewer
 * Client-facing component. Renders a PDF with signature zone overlays.
 * Client clicks on a zone → signature canvas modal → save signature.
 * When all zones are signed, calls onSubmit with all signatures.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import SignatureCanvas from "react-signature-canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  PenTool,
  CheckCircle2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SignatureZone } from "@shared/api";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SignatureData {
  zone_id: string;
  signature_data: string; // base64 PNG
}

interface PDFSigningViewerProps {
  pdfUrl: string;
  zones: SignatureZone[];
  existingSignatures?: SignatureData[];
  onSubmit: (signatures: SignatureData[]) => void;
  isSubmitting?: boolean;
  readOnly?: boolean;
}

const toProxiedUrl = (url: string) =>
  url.includes("disruptinglabs.com")
    ? `/api/proxy/pdf?url=${encodeURIComponent(url)}`
    : url;

const PDFSigningViewer: React.FC<PDFSigningViewerProps> = ({
  pdfUrl,
  zones,
  existingSignatures = [],
  onSubmit,
  isSubmitting = false,
  readOnly = false,
}) => {
  const displayUrl = toProxiedUrl(pdfUrl);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageWidth, setPageWidth] = useState<number>(620);
  const [signatures, setSignatures] = useState<Map<string, string>>(
    new Map(existingSignatures.map((s) => [s.zone_id, s.signature_data])),
  );
  const [signingZone, setSigningZone] = useState<SignatureZone | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const sigContainerRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(450);

  const currentPageZones = zones.filter((z) => z.page === currentPage);
  const allSigned =
    zones.length > 0 && zones.every((z) => signatures.has(z.id));
  const signedCount = zones.filter((z) => signatures.has(z.id)).length;

  // Measure the canvas container width so the canvas is never wider than its wrapper
  useEffect(() => {
    const updateWidth = () => {
      if (sigContainerRef.current) {
        setCanvasWidth(Math.min(450, sigContainerRef.current.offsetWidth));
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (sigContainerRef.current) observer.observe(sigContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleClearCanvas = () => {
    sigCanvasRef.current?.clear();
  };

  const handleConfirmSignature = () => {
    if (!signingZone || !sigCanvasRef.current) return;
    if (sigCanvasRef.current.isEmpty()) return;

    const dataUrl = sigCanvasRef.current.toDataURL("image/png");
    setSignatures((prev) => {
      const next = new Map(prev);
      next.set(signingZone.id, dataUrl);
      return next;
    });
    setSigningZone(null);
  };

  const handleRemoveSignature = (zoneId: string) => {
    setSignatures((prev) => {
      const next = new Map(prev);
      next.delete(zoneId);
      return next;
    });
  };

  const handleSubmit = () => {
    const sigs: SignatureData[] = zones
      .filter((z) => signatures.has(z.id))
      .map((z) => ({
        zone_id: z.id,
        signature_data: signatures.get(z.id)!,
      }));
    onSubmit(sigs);
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {signedCount} / {zones.length} zones signed
          </span>
          <div className="flex gap-1">
            {zones.map((z) => (
              <div
                key={z.id}
                className={`w-3 h-3 rounded-full transition-colors ${
                  signatures.has(z.id)
                    ? "bg-green-500"
                    : "bg-muted border border-muted-foreground/30"
                }`}
                title={z.label}
              />
            ))}
          </div>
        </div>
        {allSigned && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Badge className="bg-green-500 text-white gap-1">
              <CheckCircle2 className="h-3 w-3" />
              All zones signed!
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Page Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Page {currentPage} / {numPages || "?"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageWidth((w) => Math.max(300, w - 80))}
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageWidth((w) => Math.min(800, w + 80))}
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* PDF + zone overlay */}
      <div className="border rounded-lg overflow-auto bg-gray-100 shadow-inner">
        {pdfError ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            <div className="text-center p-6">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{pdfError}</p>
            </div>
          </div>
        ) : (
          <div className="relative select-none inline-block">
            <Document
              file={displayUrl}
              onLoadSuccess={({ numPages }) => {
                setNumPages(numPages);
                setPdfError(null);
              }}
              onLoadError={(err) => {
                logger.error("PDF load error:", err);
                setPdfError("Could not load the PDF. Please try refreshing.");
              }}
              loading={
                <div className="flex items-center justify-center h-48 w-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>

            {/* Zone overlays */}
            {currentPageZones.map((zone) => {
              const isSigned = signatures.has(zone.id);
              const sigData = signatures.get(zone.id);

              return (
                <div
                  key={zone.id}
                  className="absolute group"
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                    zIndex: 10,
                  }}
                >
                  {isSigned && sigData ? (
                    // Signed: show the signature image
                    <div
                      className={cn(
                        "w-full h-full relative border-2 border-green-500 rounded overflow-hidden bg-white/80",
                        !readOnly && "cursor-pointer",
                      )}
                      title={
                        readOnly
                          ? `${zone.label} – signed`
                          : `${zone.label} – signed. Click to re-sign.`
                      }
                      onClick={() => {
                        if (readOnly) return;
                        handleRemoveSignature(zone.id);
                        setSigningZone(zone);
                      }}
                    >
                      <img
                        src={sigData}
                        alt="Signature"
                        className="w-full h-full object-contain"
                      />
                      {!readOnly && (
                        <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/10 transition-colors flex items-end justify-end p-1">
                          <span className="text-xs text-green-700 bg-white/80 rounded px-1 hidden group-hover:block">
                            Re-sign
                          </span>
                        </div>
                      )}
                      <CheckCircle2 className="absolute top-1 right-1 h-3 w-3 text-green-500" />
                    </div>
                  ) : readOnly ? (
                    // ReadOnly + unsigned: show "not signed" placeholder
                    <div
                      className="w-full h-full border-2 border-dashed border-muted-foreground/30 rounded flex flex-col items-center justify-center gap-1 bg-muted/20"
                      title={`${zone.label} – not signed`}
                    >
                      <PenTool className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      <span className="text-xs text-muted-foreground/70 truncate px-1 max-w-full">
                        {zone.label}
                      </span>
                    </div>
                  ) : (
                    // Unsigned: clickable "Sign here" button
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSigningZone(zone)}
                      className="w-full h-full border-2 border-dashed border-primary rounded flex flex-col items-center justify-center gap-1 bg-primary/5 hover:bg-primary/10 transition-all"
                      title={`Click to sign: ${zone.label}`}
                    >
                      <PenTool className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-semibold text-primary truncate px-1 max-w-full">
                        {zone.label}
                      </span>
                    </motion.button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Zone navigation helpers */}
      {!readOnly &&
        zones.some((z) => z.page !== currentPage && !signatures.has(z.id)) && (
          <div className="flex flex-wrap gap-2">
            {zones
              .filter((z) => z.page !== currentPage && !signatures.has(z.id))
              .map((z) => (
                <button
                  key={z.id}
                  onClick={() => setCurrentPage(z.page)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <PenTool className="h-3 w-3" />
                  Sign "{z.label}" on page {z.page}
                </button>
              ))}
          </div>
        )}

      {/* Submit button */}
      <AnimatePresence>
        {!readOnly && allSigned && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Submit Signed Document
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signature Canvas Modal */}
      <Dialog
        open={!readOnly && !!signingZone}
        onOpenChange={(open) => !open && setSigningZone(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              Sign Here
            </DialogTitle>
            <DialogDescription>
              {signingZone?.label} — Draw your signature in the box below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Signature canvas */}
            <div
              ref={sigContainerRef}
              className="border-2 border-dashed border-primary rounded-lg overflow-hidden bg-white"
            >
              <SignatureCanvas
                ref={sigCanvasRef}
                canvasProps={{
                  width: canvasWidth,
                  height: 180,
                  className: "w-full",
                  style: { touchAction: "none" },
                }}
                penColor="#1e293b"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Sign with your mouse or touch screen
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClearCanvas}
                className="flex-1 gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </Button>
              <Button onClick={handleConfirmSignature} className="flex-1 gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Confirm Signature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PDFSigningViewer;

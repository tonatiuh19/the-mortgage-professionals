/**
 * PDFSignatureZoneEditor
 * Broker-facing component. Renders a PDF and allows the broker to drag/draw
 * signature zones on each page. Zones are stored as percentages of the page
 * dimensions so they are resolution-independent.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  PenTool,
  Tag,
  ZoomIn,
  ZoomOut,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import type { SignatureZone } from "@shared/api";
import { logger } from "@/lib/logger";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFSignatureZoneEditorProps {
  pdfUrl: string;
  zones: SignatureZone[];
  onChange: (zones: SignatureZone[]) => void;
}

const ZONE_COLORS = [
  "rgba(59,130,246,0.25)", // blue
  "rgba(16,185,129,0.25)", // green
  "rgba(245,158,11,0.25)", // amber
  "rgba(239,68,68,0.25)", // red
  "rgba(168,85,247,0.25)", // purple
];

const ZONE_BORDER_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
];

const toProxiedUrl = (url: string) =>
  url.includes("disruptinglabs.com")
    ? `/api/proxy/pdf?url=${encodeURIComponent(url)}`
    : url;

const PDFSignatureZoneEditor: React.FC<PDFSignatureZoneEditorProps> = ({
  pdfUrl,
  zones,
  onChange,
}) => {
  const displayUrl = toProxiedUrl(pdfUrl);
  logger.log(
    "📄 PDFSignatureZoneEditor: pdfUrl",
    pdfUrl,
    "→ displayUrl",
    displayUrl,
  );
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageWidth, setPageWidth] = useState<number>(650);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [drawCurrent, setDrawCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const pageContainerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const onDocumentLoadError = (err: Error) => {
    logger.error("PDF load error:", err, "url was:", displayUrl);
    setPdfError("Failed to load PDF. The file might not be accessible.");
  };

  // Convert pixel position relative to page container → percentage
  const toPercent = useCallback(
    (px: number, py: number): { x: number; y: number } => {
      const container = pageContainerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(100, ((px - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((py - rect.top) / rect.height) * 100)),
      };
    },
    [],
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // only left click
    e.preventDefault();
    const pos = { x: e.clientX, y: e.clientY };
    setIsDrawing(true);
    setDrawStart(pos);
    setDrawCurrent(pos);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDrawing) return;
      setDrawCurrent({ x: e.clientX, y: e.clientY });
    },
    [isDrawing],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isDrawing || !drawStart) return;
      setIsDrawing(false);

      const start = toPercent(drawStart.x, drawStart.y);
      const end = toPercent(e.clientX, e.clientY);

      // Normalize to top-left + width/height
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);

      // Ignore tiny zones (accidental clicks)
      if (width < 3 || height < 2) {
        setDrawStart(null);
        setDrawCurrent(null);
        return;
      }

      const newZone: SignatureZone = {
        id: `zone_${Date.now()}`,
        page: currentPage,
        x,
        y,
        width,
        height,
        label: `Signature ${zones.length + 1}`,
      };

      onChange([...zones, newZone]);
      setDrawStart(null);
      setDrawCurrent(null);
    },
    [isDrawing, drawStart, toPercent, currentPage, zones, onChange],
  );

  // Global mouse event listeners
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Compute the in-progress drawing rectangle in % coords
  const getDrawingRect = () => {
    if (!drawStart || !drawCurrent || !pageContainerRef.current) return null;
    const start = toPercent(drawStart.x, drawStart.y);
    const end = toPercent(drawCurrent.x, drawCurrent.y);
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  };

  const drawingRect = getDrawingRect();

  const removeZone = (id: string) => {
    onChange(zones.filter((z) => z.id !== id));
    if (editingZoneId === id) setEditingZoneId(null);
  };

  const updateZoneLabel = (id: string, label: string) => {
    onChange(zones.map((z) => (z.id === id ? { ...z, label } : z)));
  };

  const currentPageZones = zones.filter((z) => z.page === currentPage);

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Left: PDF Viewer + Zone Canvas */}
      <div className="flex-1 min-w-0">
        {/* Page Controls */}
        <div className="flex items-center justify-between mb-3 px-1">
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
              onClick={() => setPageWidth((w) => Math.min(900, w + 80))}
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Instruction hint */}
        <Alert className="mb-3 border-blue-200 bg-blue-50/50">
          <PenTool className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-xs">
            Click and drag on the document to draw a signature zone.
          </AlertDescription>
        </Alert>

        {/* PDF Container */}
        <div className="border rounded-lg overflow-hidden bg-gray-100 shadow-inner">
          {pdfError ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              <div className="text-center">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{pdfError}</p>
                <p className="text-xs mt-1 opacity-70">
                  Try opening the PDF URL directly to verify it's accessible.
                </p>
              </div>
            </div>
          ) : (
            <div
              ref={pageContainerRef}
              className="relative select-none"
              style={{ cursor: "crosshair", display: "inline-block" }}
              onMouseDown={handleMouseDown}
            >
              <Document
                file={displayUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center h-64 w-full">
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

              {/* Existing zone overlays */}
              {currentPageZones.map((zone, idx) => (
                <div
                  key={zone.id}
                  className="absolute border-2 rounded pointer-events-none flex items-center justify-center"
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                    backgroundColor: ZONE_COLORS[idx % ZONE_COLORS.length],
                    borderColor:
                      ZONE_BORDER_COLORS[idx % ZONE_BORDER_COLORS.length],
                    borderStyle: "dashed",
                    zIndex: 10,
                  }}
                >
                  <span
                    className="text-xs font-bold text-white px-1 rounded truncate max-w-full"
                    style={{
                      backgroundColor:
                        ZONE_BORDER_COLORS[idx % ZONE_BORDER_COLORS.length],
                      fontSize: "10px",
                    }}
                  >
                    {zone.label}
                  </span>
                </div>
              ))}

              {/* In-progress drawing rect */}
              {isDrawing && drawingRect && drawingRect.width > 0 && (
                <div
                  className="absolute border-2 border-dashed border-primary bg-primary/10 rounded pointer-events-none"
                  style={{
                    left: `${drawingRect.x}%`,
                    top: `${drawingRect.y}%`,
                    width: `${drawingRect.width}%`,
                    height: `${drawingRect.height}%`,
                    zIndex: 20,
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Zone List */}
      <div className="w-full md:w-64 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Signature Zones</h4>
          <Badge variant="secondary" className="ml-auto">
            {zones.length}
          </Badge>
        </div>

        {zones.length === 0 ? (
          <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
            <PenTool className="h-6 w-6 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-xs text-muted-foreground">
              Draw on the PDF to add zones
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            <AnimatePresence>
              {zones.map((zone, idx) => (
                <motion.div
                  key={zone.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    editingZoneId === zone.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() =>
                    setEditingZoneId(editingZoneId === zone.id ? null : zone.id)
                  }
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          ZONE_BORDER_COLORS[idx % ZONE_BORDER_COLORS.length],
                      }}
                    />
                    {editingZoneId === zone.id ? (
                      <Input
                        value={zone.label}
                        onChange={(e) =>
                          updateZoneLabel(zone.id, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 text-xs py-0 px-1"
                      />
                    ) : (
                      <span className="text-xs font-medium truncate flex-1">
                        {zone.label}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeZone(zone.id);
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Page {zone.page} • {zone.width.toFixed(0)}% ×{" "}
                    {zone.height.toFixed(0)}%
                  </div>
                  {zone.page !== currentPage && (
                    <button
                      className="text-xs text-primary hover:underline mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPage(zone.page);
                      }}
                    >
                      Go to page {zone.page}
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFSignatureZoneEditor;

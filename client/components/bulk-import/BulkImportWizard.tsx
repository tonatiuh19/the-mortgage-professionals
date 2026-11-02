import React, { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  UserCircle2,
  XCircle,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  closeBulkImportWizard,
  commitBulkImport,
  downloadBulkImportTemplate,
  resetBulkImportWizard,
  setBulkImportCommitOptions,
  setBulkImportSearchQuery,
  setBulkImportStep,
  setBulkImportTableFilter,
  validateBulkImport,
} from "@/store/slices/bulkImportSlice";
import { fetchClients } from "@/store/slices/clientsSlice";
import { fetchBrokers } from "@/store/slices/brokersSlice";
import BulkImportSummaryCards from "@/components/bulk-import/BulkImportSummaryCards";
import BulkImportPreviewTable from "@/components/bulk-import/BulkImportPreviewTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  BULK_IMPORT_ACK_THRESHOLD,
  BULK_LEAD_SOURCES,
  BULK_PARTNER_TYPES,
  buildCommitResultsCsv,
  buildPreviewReportCsv,
  downloadTextFile,
  type BulkImportTableFilter,
} from "@shared/bulk-import";
import type { BulkImportEntityType } from "@shared/api";

const STEP_LABELS = [
  "Get started",
  "Upload",
  "Review",
  "Confirm",
  "Results",
];

interface BulkImportWizardProps {
  entity: BulkImportEntityType;
}

export default function BulkImportWizard({ entity }: BulkImportWizardProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ackChecked, setAckChecked] = useState(false);

  const { user } = useAppSelector((s) => s.brokerAuth);
  const {
    wizardOpen,
    wizardStep,
    entity: sliceEntity,
    preview,
    commitResult,
    commitOptions,
    validating,
    committing,
    downloadingTemplate,
    error,
    tableFilter,
    searchQuery,
  } = useAppSelector((s) => s.bulkImport);

  const isActive = wizardOpen && sliceEntity === entity;
  const entityLabel = entity === "clients" ? "clients" : "people";
  const ownerName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : "you";

  const rowCounts = useMemo(() => {
    const rows = preview?.previewRows ?? [];
    return {
      all: rows.length,
      ready: rows.filter((r) => r.status === "will_create").length,
      skipped: rows.filter((r) => r.status === "skipped").length,
      error: rows.filter((r) => r.status === "error").length,
    };
  }, [preview?.previewRows]);

  const needsAck =
    (preview?.willCreateCount ?? 0) > BULK_IMPORT_ACK_THRESHOLD;

  const canContinueFromReview =
    (preview?.willCreateCount ?? 0) > 0;

  const canConfirm =
    canContinueFromReview && (!needsAck || ackChecked) && !committing;

  const handleClose = () => {
    dispatch(closeBulkImportWizard());
    setSelectedFile(null);
    setAckChecked(false);
  };

  const processFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) return;
      setSelectedFile(file);
      dispatch(validateBulkImport({ file, entity }));
    },
    [dispatch, entity],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDownloadTemplate = () => {
    dispatch(downloadBulkImportTemplate(entity));
  };

  const handleDownloadErrorReport = () => {
    if (!preview?.previewRows?.length) return;
    const csv = buildPreviewReportCsv(
      preview.previewRows.map((r) => ({
        row_number: r.row_number,
        status: r.status,
        display_name: r.display_name,
        email: r.email,
        phone: r.phone,
        badge: r.badge,
        message: r.message,
        external_ref: r.external_ref,
        conflict_entity_id: r.conflict_entity_id,
      })),
    );
    downloadTextFile(
      `import-errors-${preview.fileName ?? "report"}.csv`,
      csv,
    );
  };

  const handleDownloadResults = () => {
    if (!commitResult?.results?.length) return;
    const csv = buildCommitResultsCsv(commitResult.results);
    downloadTextFile(
      `import-results-${preview?.fileName ?? "report"}.csv`,
      csv,
    );
  };

  const handleCommit = async () => {
    if (!preview?.jobId) return;
    await dispatch(
      commitBulkImport({
        jobId: preview.jobId,
        options: commitOptions,
      }),
    ).unwrap();
    if (entity === "clients") {
      dispatch(fetchClients({ page: 1, limit: 30 }));
    } else {
      dispatch(fetchBrokers({ page: 1, limit: 30 }));
    }
  };

  const breakdownEntries = Object.entries(preview?.breakdown ?? {}).sort(
    (a, b) => b[1] - a[1],
  );
  const breakdownMax = breakdownEntries[0]?.[1] ?? 1;

  return (
    <Dialog open={isActive} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={cn(
          "flex max-h-[95vh] flex-col gap-0 overflow-hidden p-0",
          "w-[min(100vw-1rem,48rem)] sm:max-w-3xl",
          "max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:rounded-none",
        )}
        aria-describedby="bulk-import-desc"
      >
        <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import {entity === "clients" ? "Clients" : "People"}
          </DialogTitle>
          <DialogDescription id="bulk-import-desc">
            Step {wizardStep + 1} of 5 · {STEP_LABELS[wizardStep]}
          </DialogDescription>
          <div className="mt-3 flex gap-1">
            {STEP_LABELS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= wizardStep ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto px-4 py-4 sm:px-6"
          aria-live="polite"
        >
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Step 0 — Get started */}
          {wizardStep === 0 && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <p className="text-sm text-muted-foreground">
                Review every row before importing. Nothing is saved until you
                confirm.
              </p>
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                {entity === "clients" ? (
                  <p>
                    All imported clients are assigned to{" "}
                    <strong>you</strong> ({ownerName}).{" "}
                    <code className="text-xs">lead_source</code> is required on
                    every row.
                  </p>
                ) : (
                  <p>
                    All imported realtors are created under your account.{" "}
                    <code className="text-xs">partner_type</code> must be{" "}
                    <code className="text-xs">realtor</code> or{" "}
                    <code className="text-xs">mortgage_banker</code>.
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
              >
                {downloadingTemplate ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download CSV template
              </Button>
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  {entity === "clients" ? "Lead sources" : "Partner types"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(entity === "clients"
                    ? BULK_LEAD_SOURCES
                    : BULK_PARTNER_TYPES
                  ).map((v) => (
                    <code
                      key={v}
                      className="rounded bg-muted px-1.5 py-0.5 text-xs"
                    >
                      {v}
                    </code>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 1 — Upload */}
          {wizardStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fileInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all",
                  dragOver
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
                )}
              >
                {validating ? (
                  <>
                    <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
                    <p className="font-medium">Validating your file…</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Checking headers, rows, and database
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="font-medium">Drop your CSV here</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      or click to browse · .csv only
                    </p>
                    {selectedFile && (
                      <p className="mt-3 text-sm text-primary">
                        {selectedFile.name} (
                        {(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFile(file);
                }}
              />
            </motion.div>
          )}

          {/* Step 2 — Review */}
          {wizardStep === 2 && preview && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <BulkImportSummaryCards
                willCreate={preview.willCreateCount}
                skipped={preview.skippedCount}
                errors={preview.errorCount}
                total={preview.rowCount}
              />
              <p className="text-xs text-muted-foreground">
                {preview.fileName}
                {preview.expiresAt &&
                  ` · expires ${new Date(preview.expiresAt).toLocaleTimeString()}`}
              </p>

              {breakdownEntries.length > 0 && (
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {entity === "clients" ? "By lead source" : "By partner type"}
                  </p>
                  {breakdownEntries.map(([key, count]) => (
                    <div key={key} className="flex items-center gap-3 text-sm">
                      <span className="w-36 shrink-0 truncate font-mono text-xs">
                        {key}
                      </span>
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${Math.round((count / breakdownMax) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5 text-sm">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <UserCircle2 className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span>
                  <strong>{preview.willCreateCount}</strong> {entityLabel} will
                  be assigned to you
                </span>
              </div>

              {preview.errorCount > 0 && preview.willCreateCount === 0 && (
                <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  Fix errors in your CSV and re-upload. Nothing can be imported.
                </div>
              )}
              {preview.errorCount > 0 && preview.willCreateCount > 0 && (
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  {preview.errorCount} rows will not be imported.{" "}
                  {preview.willCreateCount} ready.
                </div>
              )}
              {preview.errorCount === 0 && preview.willCreateCount > 0 && (
                <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  All rows ready to import.
                </div>
              )}

              <BulkImportPreviewTable
                rows={(preview.previewRows ?? []).map((r) => ({
                  row_number: r.row_number,
                  status: r.status,
                  message: r.message,
                  external_ref: r.external_ref,
                  display_name: r.display_name,
                  email: r.email,
                  phone: r.phone,
                  badge: r.badge,
                  conflict_entity_id: r.conflict_entity_id,
                }))}
                entity={entity}
                filter={tableFilter}
                search={searchQuery}
                counts={rowCounts}
                onFilterChange={(f: BulkImportTableFilter) =>
                  dispatch(setBulkImportTableFilter(f))
                }
                onSearchChange={(q) => dispatch(setBulkImportSearchQuery(q))}
              />
            </motion.div>
          )}

          {/* Step 3 — Confirm */}
          {wizardStep === 3 && preview && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <p className="text-base font-medium">
                You are about to import{" "}
                <strong>{preview.willCreateCount}</strong> {entityLabel}.
              </p>
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="link-threads" className="flex-1 text-sm">
                    Link existing phone threads
                  </Label>
                  <Switch
                    id="link-threads"
                    checked={commitOptions.link_phone_threads !== false}
                    onCheckedChange={(v) =>
                      dispatch(
                        setBulkImportCommitOptions({ link_phone_threads: v }),
                      )
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="welcome-email" className="flex-1 text-sm">
                    Send welcome emails
                  </Label>
                  <Switch
                    id="welcome-email"
                    checked={commitOptions.send_welcome_emails === true}
                    onCheckedChange={(v) =>
                      dispatch(
                        setBulkImportCommitOptions({ send_welcome_emails: v }),
                      )
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Duplicate policy: skip existing records (v1)
                </p>
              </div>
              {needsAck && (
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <Checkbox
                    id="bulk-ack"
                    checked={ackChecked}
                    onCheckedChange={(v) => setAckChecked(v === true)}
                  />
                  <Label htmlFor="bulk-ack" className="text-sm leading-snug">
                    I have reviewed the summary and understand these records
                    will be assigned to me.
                  </Label>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4 — Results */}
          {wizardStep === 4 && commitResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5 text-center py-4"
            >
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
              <div>
                <p className="text-lg font-semibold">Import complete</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {commitResult.created_count ?? 0} created ·{" "}
                  {commitResult.skipped_count ?? 0} skipped ·{" "}
                  {commitResult.error_count ?? 0} failed
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={handleDownloadResults} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download results CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleClose();
                    navigate(
                      entity === "clients" ? "/admin/clients" : "/admin/brokers",
                    );
                  }}
                >
                  View imported {entityLabel}
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer actions */}
        {wizardStep < 4 && (
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 sm:px-6">
            <div className="flex gap-2">
              {wizardStep > 0 && wizardStep < 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    if (wizardStep === 2) {
                      dispatch(resetBulkImportWizard());
                      setSelectedFile(null);
                      dispatch(setBulkImportStep(1));
                    } else {
                      dispatch(setBulkImportStep((wizardStep - 1) as 0 | 1 | 2 | 3));
                    }
                  }}
                  disabled={validating || committing}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              {wizardStep === 2 && (preview?.errorCount ?? 0) > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadErrorReport}
                >
                  Error report
                </Button>
              )}
            </div>
            <div className="flex gap-2 ml-auto">
              {wizardStep === 0 && (
                <Button
                  className="gap-1"
                  onClick={() => dispatch(setBulkImportStep(1))}
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {wizardStep === 2 && (
                <Button
                  className="gap-1"
                  disabled={!canContinueFromReview}
                  onClick={() => dispatch(setBulkImportStep(3))}
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {wizardStep === 3 && (
                <Button
                  className="gap-1 min-w-[140px]"
                  disabled={!canConfirm}
                  onClick={handleCommit}
                >
                  {committing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Import {preview?.willCreateCount} {entityLabel}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
        {wizardStep === 4 && (
          <div className="shrink-0 border-t px-4 py-3 sm:px-6 flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                dispatch(resetBulkImportWizard());
                setSelectedFile(null);
                setAckChecked(false);
                dispatch(setBulkImportStep(0));
              }}
            >
              Import another file
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
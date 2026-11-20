import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Cloud,
  CloudOff,
  ExternalLink,
  FileText,
  History,
  Loader2,
  RotateCcw,
  Rocket,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  LEGAL_DOC_KEYS,
  LEGAL_DOC_META,
  checkLegalRequirements,
  fillLegalPlaceholders,
  findUnknownPlaceholders,
  formatLegalDate,
  type LegalCompanyDetails,
  type LegalDocKey,
} from "@shared/legal";
import { LegalMarkdown } from "@/components/LegalMarkdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  discardLegalDraft,
  fetchAdminLegal,
  fetchLegalVersion,
  publishLegalDoc,
  saveLegalDetails,
  saveLegalDraft,
} from "@/store/slices/legalSlice";

// The editor (Tiptap) only loads for platform owners who open this section.
const LegalMarkdownEditor = lazy(() => import("@/components/legal/LegalMarkdownEditor"));

const AUTOSAVE_MS = 1200;

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const detailsSchema = Yup.object({
  company_name: Yup.string().trim().max(200).required("Company legal name is required"),
  company_short_name: Yup.string().trim().max(200),
  nmls: Yup.string().trim().max(40).matches(/^[0-9]*$/, "Digits only (no #)"),
  phone: Yup.string()
    .trim()
    .max(40)
    .test("phone", "Enter a full phone number", (v) => !v || v.replace(/\D/g, "").length >= 10),
  email: Yup.string().trim().email("Enter a valid email").max(200),
  website: Yup.string().trim().max(300).matches(/^https?:\/\/\S+\.\S+$/i, { message: "Start with https://", excludeEmptyString: true }),
  address_line1: Yup.string().trim().max(200),
  address_line2: Yup.string().trim().max(200),
});

const DETAIL_FIELDS: { key: keyof LegalCompanyDetails; label: string; placeholder: string; wide?: boolean }[] = [
  { key: "company_name", label: "Company legal name", placeholder: "The Mortgage Professionals, Inc.", wide: true },
  { key: "company_short_name", label: "Short name", placeholder: "The Mortgage Professionals" },
  { key: "nmls", label: "Company NMLS #", placeholder: "2302276" },
  { key: "phone", label: "Phone (also used in the SMS HELP reply)", placeholder: "(562) 665-4132" },
  { key: "email", label: "Email", placeholder: "privacy@company.com" },
  { key: "website", label: "Website", placeholder: "https://www.themortgageprofessionals.net/", wide: true },
  { key: "address_line1", label: "Address line 1", placeholder: "16901 Bellflower Blvd." },
  { key: "address_line2", label: "City, state, ZIP", placeholder: "Bellflower, CA 90706" },
];

/** Platform-owner editor for the public Privacy Policy and Terms & Conditions. */
export function LegalPagesManager() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { details, docs, adminLoading, detailsSaving, draftSave, draftSavedAt, publishing } = useAppSelector((s) => s.legal);

  const [active, setActive] = useState<LegalDocKey>("privacy");
  const [working, setWorking] = useState<Partial<Record<LegalDocKey, string>>>({});
  const [resetTick, setResetTick] = useState(0);
  const [publishOpen, setPublishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(todayIso());
  const [changeNote, setChangeNote] = useState("");
  const [viewing, setViewing] = useState<{ version: number; markdown: string; effective_date: string } | null>(null);
  const timers = useRef<Partial<Record<LegalDocKey, ReturnType<typeof setTimeout>>>>({});

  useEffect(() => {
    dispatch(fetchAdminLegal());
  }, [dispatch]);

  const doc = docs.find((d) => d.doc_key === active);
  const baseline = doc ? doc.draft_markdown ?? doc.published_markdown : "";
  const text = working[active] ?? baseline;
  const hasDraft = Boolean(doc?.draft_markdown) || (working[active] !== undefined && working[active] !== doc?.published_markdown);
  const saveState = draftSave[active] ?? "idle";

  // Warn before leaving while a save is pending.
  useEffect(() => {
    const pending = saveState === "saving" || Object.values(timers.current).some(Boolean);
    if (!pending) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState, working]);

  const scheduleSave = useCallback(
    (docKey: LegalDocKey, markdown: string) => {
      setWorking((w) => ({ ...w, [docKey]: markdown }));
      clearTimeout(timers.current[docKey]);
      timers.current[docKey] = setTimeout(() => {
        delete timers.current[docKey];
        dispatch(saveLegalDraft({ docKey, markdown }));
      }, AUTOSAVE_MS);
    },
    [dispatch],
  );

  const flushSave = async (docKey: LegalDocKey) => {
    if (!timers.current[docKey]) return;
    clearTimeout(timers.current[docKey]);
    delete timers.current[docKey];
    const md = working[docKey];
    if (md !== undefined) await dispatch(saveLegalDraft({ docKey, markdown: md }));
  };

  const preview = useCallback(
    (markdown: string) => (details ? fillLegalPlaceholders(markdown, details, effectiveDate) : markdown),
    [details, effectiveDate],
  );
  const checks = useMemo(() => checkLegalRequirements(active, preview(text)), [active, preview, text]);
  const unknown = useMemo(() => findUnknownPlaceholders(text), [text]);
  const missing = checks.filter((c) => !c.ok);

  const detailsForm = useFormik<Record<keyof LegalCompanyDetails, string>>({
    enableReinitialize: true,
    initialValues: {
      company_name: details?.company_name ?? "",
      company_short_name: details?.company_short_name ?? "",
      nmls: details?.nmls ?? "",
      phone: details?.phone ?? "",
      email: details?.email ?? "",
      website: details?.website ?? "",
      address_line1: details?.address_line1 ?? "",
      address_line2: details?.address_line2 ?? "",
    },
    validationSchema: detailsSchema,
    onSubmit: async (values) => {
      const payload = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v.trim() || null]),
      ) as unknown as LegalCompanyDetails;
      const res = await dispatch(saveLegalDetails(payload));
      toast(
        saveLegalDetails.fulfilled.match(res)
          ? { title: "Company details saved", description: "Both legal pages now show the new details." }
          : { title: "Could not save", description: res.payload as string, variant: "destructive" },
      );
    },
  });

  const doPublish = async () => {
    await flushSave(active);
    const res = await dispatch(publishLegalDoc({ docKey: active, effective_date: effectiveDate, change_note: changeNote.trim() || undefined }));
    if (publishLegalDoc.fulfilled.match(res)) {
      setWorking((w) => ({ ...w, [active]: undefined }));
      setResetTick((t) => t + 1);
      setPublishOpen(false);
      setChangeNote("");
      toast({ title: `${LEGAL_DOC_META[active].title} v${res.payload.version} is live` });
    } else {
      toast({ title: "Could not publish", description: res.payload as string, variant: "destructive" });
    }
  };

  const doDiscard = async () => {
    clearTimeout(timers.current[active]);
    delete timers.current[active];
    const res = await dispatch(discardLegalDraft(active));
    if (discardLegalDraft.fulfilled.match(res)) {
      setWorking((w) => ({ ...w, [active]: undefined }));
      setResetTick((t) => t + 1);
      toast({ title: "Draft discarded", description: "The editor now shows the live version." });
    }
    setDiscardOpen(false);
  };

  const openVersion = async (version: number) => {
    const res = await dispatch(fetchLegalVersion({ docKey: active, version }));
    if (fetchLegalVersion.fulfilled.match(res)) setViewing(res.payload);
    else toast({ title: "Could not load version", description: res.payload as string, variant: "destructive" });
  };

  const restoreVersion = () => {
    if (!viewing) return;
    clearTimeout(timers.current[active]);
    delete timers.current[active];
    setWorking((w) => ({ ...w, [active]: viewing.markdown }));
    dispatch(saveLegalDraft({ docKey: active, markdown: viewing.markdown }));
    setResetTick((t) => t + 1);
    toast({ title: `v${viewing.version} restored into your draft`, description: "Review it, then Publish to make it live." });
    setViewing(null);
  };

  if (adminLoading || !details || docs.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company details */}
      <form onSubmit={detailsForm.handleSubmit} className="rounded-xl border bg-muted/20 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-4 w-4 text-primary" /> Company details
          <span className="font-normal text-muted-foreground">— fills every {"{{field}}"} in both documents</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {DETAIL_FIELDS.map((f) => {
            const err = detailsForm.touched[f.key] && detailsForm.errors[f.key];
            return (
              <div key={f.key} className={cn("space-y-1", f.wide && "sm:col-span-2")}>
                <Label htmlFor={`legal-${f.key}`} className="text-xs">{f.label}</Label>
                <Input
                  id={`legal-${f.key}`}
                  placeholder={f.placeholder}
                  {...detailsForm.getFieldProps(f.key)}
                  className={cn("h-9", err && "border-destructive")}
                />
                {err && <p className="text-xs text-destructive">{err}</p>}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="submit" size="sm" disabled={detailsSaving || !detailsForm.dirty}>
            {detailsSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save details
          </Button>
        </div>
      </form>

      {/* Document tabs + status */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          value={active}
          onValueChange={async (v) => {
            await flushSave(active);
            setActive(v as LegalDocKey);
          }}
        >
          <TabsList>
            {LEGAL_DOC_KEYS.map((k) => {
              const d = docs.find((x) => x.doc_key === k);
              return (
                <TabsTrigger key={k} value={k} className="gap-2">
                  {k === "privacy" ? <ShieldCheck className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  {LEGAL_DOC_META[k].title}
                  {(d?.draft_markdown || working[k] !== undefined) && (
                    <span className="h-2 w-2 rounded-full bg-amber-500" aria-label="Unpublished changes" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {doc?.published_version ? (
            <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="h-3 w-3" /> Live v{doc.published_version}
              {doc.published_effective_date ? ` · ${formatLegalDate(doc.published_effective_date)}` : ""}
            </Badge>
          ) : (
            <Badge variant="outline">Not published</Badge>
          )}
          <SaveIndicator state={saveState} savedAt={draftSavedAt[active] ?? doc?.draft_updated_at ?? null} hasDraft={hasDraft} />
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
            <Link to={LEGAL_DOC_META[active].path} target="_blank" rel="noopener noreferrer">
              View live <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-3">
          <Suspense fallback={<Skeleton className="h-[480px] w-full rounded-xl" />}>
            <LegalMarkdownEditor
              value={text}
              resetKey={`${active}:${doc?.published_version ?? 0}:${resetTick}`}
              onChange={(md) => scheduleSave(active, md)}
              renderPreview={preview}
            />
          </Suspense>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {hasDraft && (
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={() => setDiscardOpen(true)}>
                <Trash2 className="h-4 w-4" /> Discard changes
              </Button>
            )}
            <Button type="button" className="gap-2" disabled={!hasDraft || publishing === active} onClick={() => setPublishOpen(true)}>
              {publishing === active ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Publish…
            </Button>
          </div>
        </div>

        {/* Side panel: checklist + history */}
        <aside className="space-y-4">
          <div className="rounded-xl border p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" /> SMS carrier checklist
            </p>
            <ul className="space-y-1.5 text-xs">
              {checks.map((c) => (
                <li key={c.id} className={cn("flex items-start gap-1.5", c.ok ? "text-muted-foreground" : "text-amber-700")}>
                  {c.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                  {c.label}
                </li>
              ))}
            </ul>
            {unknown.length > 0 && (
              <p className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                Unknown field{unknown.length > 1 ? "s" : ""}: {unknown.map((u) => `{{${u}}}`).join(", ")} — will show as typed.
              </p>
            )}
          </div>
          <div className="rounded-xl border p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4 text-primary" /> Version history
            </p>
            <ol className="max-h-72 space-y-1 overflow-y-auto">
              {doc?.versions.map((v) => (
                <li key={v.version}>
                  <button
                    type="button"
                    onClick={() => openVersion(v.version)}
                    className="w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                  >
                    <span className="font-semibold">v{v.version}</span>
                    {v.version === doc.published_version && <span className="ml-1 text-emerald-700">· live</span>}
                    <span className="block text-muted-foreground">
                      Effective {formatLegalDate(v.effective_date)}
                      {v.published_by_name ? ` · ${v.published_by_name}` : ""}
                    </span>
                    {v.change_note && <span className="block truncate text-muted-foreground">“{v.change_note}”</span>}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      {/* Publish dialog */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish {LEGAL_DOC_META[active].title}</DialogTitle>
            <DialogDescription>
              Creates v{(doc?.versions[0]?.version ?? 0) + 1}. Visitors see it immediately, and new SMS consents record this version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="legal-effective">Effective date</Label>
              <Input id="legal-effective" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="legal-note">What changed? (internal, optional)</Label>
              <Input id="legal-note" maxLength={300} value={changeNote} placeholder="e.g. Updated SMS support email" onChange={(e) => setChangeNote(e.target.value)} />
            </div>
            {missing.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="mb-1 flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-4 w-4" /> Carriers may reject SMS campaigns without:
                </p>
                <ul className="list-disc pl-5">
                  {missing.map((m) => (
                    <li key={m.id}>{m.label}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button onClick={doPublish} disabled={!effectiveDate || publishing === active} className="gap-2">
              {publishing === active && <Loader2 className="h-4 w-4 animate-spin" />}
              {missing.length ? "Publish anyway" : "Publish now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard confirm */}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unpublished changes?</AlertDialogTitle>
            <AlertDialogDescription>
              The editor goes back to the live version (v{doc?.published_version}). This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={doDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Version viewer */}
      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {LEGAL_DOC_META[active].title} v{viewing?.version}
            </DialogTitle>
            <DialogDescription>Effective {viewing ? formatLegalDate(viewing.effective_date) : ""} · shown with today's company details</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border p-4">
            {viewing && <LegalMarkdown markdown={details ? fillLegalPlaceholders(viewing.markdown, details, viewing.effective_date) : viewing.markdown} />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            <Button className="gap-2" onClick={restoreVersion}>
              <RotateCcw className="h-4 w-4" /> Restore into draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SaveIndicator({ state, savedAt, hasDraft }: { state: string; savedAt: string | null; hasDraft: boolean }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving draft…
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <CloudOff className="h-3 w-3" /> Draft not saved — keep this tab open and retry
      </span>
    );
  }
  if (!hasDraft) return <span className="text-muted-foreground">No unpublished changes</span>;
  return (
    <span className="inline-flex items-center gap-1 text-amber-700">
      <Cloud className="h-3 w-3" /> Draft saved
      {savedAt ? ` ${new Date(savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""} · not live yet
    </span>
  );
}

export default LegalPagesManager;

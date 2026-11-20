import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronDown,
  EyeOff,
  Globe,
  ImageOff,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import type {
  PublicProfileReviewItem,
  PublicProfileStatus,
  RolePublicListingSetting,
} from "@shared/api";
import { ROLE_LABELS } from "@shared/api";
import { PUBLIC_PROFILE_REQUIREMENT_LABELS } from "@shared/public-team";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchPublicProfileReviews,
  reviewPublicProfile,
  updatePublicListingRoles,
} from "@/store/slices/publicTeamSlice";

export const PUBLIC_PROFILE_STATUS_META: Record<
  PublicProfileStatus,
  { label: string; className: string }
> = {
  none: { label: "Not listed", className: "bg-muted text-muted-foreground" },
  pending: { label: "Pending review", className: "bg-amber-100 text-amber-800" },
  approved: { label: "Live on website", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Not approved", className: "bg-red-100 text-red-800" },
};

const fullName = (p: PublicProfileReviewItem) =>
  `${p.first_name} ${p.last_name}`.trim();

/** Platform-owner panel: approve website listings and choose eligible roles. */
export function PublicTeamManager() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const { reviewPeople, roles, reviewLoading, reviewSavingId, rolesSaving } =
    useAppSelector((state) => state.publicTeam);
  const [showAll, setShowAll] = useState(false);
  const [dialog, setDialog] = useState<
    | { kind: "approve"; person: PublicProfileReviewItem }
    | { kind: "reject"; person: PublicProfileReviewItem }
    | null
  >(null);
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState("100");
  const [reason, setReason] = useState("");

  useEffect(() => {
    dispatch(fetchPublicProfileReviews());
  }, [dispatch]);

  useEffect(() => {
    if (searchParams.get("tab") === "website") {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  const pending = reviewPeople.filter((p) => p.status === "pending");
  const live = reviewPeople.filter((p) => p.status === "approved");
  const others = reviewPeople.filter(
    (p) => p.status !== "pending" && p.status !== "approved",
  );
  const allowedRoles = useMemo(
    () => new Set(roles.filter((r) => r.is_allowed).map((r) => r.role)),
    [roles],
  );

  const openApprove = (person: PublicProfileReviewItem) => {
    setTitle(person.public_title ?? "");
    setOrder(String(person.public_display_order ?? 100));
    setDialog({ kind: "approve", person });
  };
  const openReject = (person: PublicProfileReviewItem) => {
    setReason("");
    setDialog({ kind: "reject", person });
  };

  const runReview = async (
    person: PublicProfileReviewItem,
    action: "approve" | "reject" | "unpublish",
    extra: { reason?: string; public_title?: string; public_display_order?: number } = {},
  ) => {
    const result = await dispatch(
      reviewPublicProfile({ brokerId: person.id, action, ...extra }),
    );
    if (reviewPublicProfile.fulfilled.match(result)) {
      toast({
        title:
          action === "approve"
            ? `${fullName(person)} is live on the website`
            : action === "reject"
              ? "Request declined"
              : `${fullName(person)} removed from the website`,
      });
      setDialog(null);
    } else {
      toast({
        title: "Could not update listing",
        description: result.payload as string,
        variant: "destructive",
      });
    }
  };

  const toggleRole = (role: RolePublicListingSetting["role"], on: boolean) => {
    const next = roles.map((r) => (r.role === role ? { ...r, is_allowed: on } : r));
    dispatch(updatePublicListingRoles(next)).then((res) => {
      if (updatePublicListingRoles.rejected.match(res)) {
        toast({
          title: "Could not update roles",
          description: res.payload as string,
          variant: "destructive",
        });
      }
    });
  };

  const parsedOrder = Number(order);
  const orderValid = Number.isInteger(parsedOrder) && parsedOrder >= 0 && parsedOrder <= 10000;

  return (
    <div ref={rootRef} id="website-team" className="scroll-mt-6">
      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            Website Team
            {pending.length > 0 && (
              <Badge className="ml-1 bg-amber-500 text-white hover:bg-amber-500">
                {pending.length} pending
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Only people you approve appear on the public Our Team page. A
            profile photo is always required, plus an NMLS number for Admins
            and Loan Officers.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Role switches */}
          <section>
            <h3 className="mb-3 text-sm font-semibold">Roles allowed on the website</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {roles.map((r) => (
                <label
                  key={r.role}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                    r.is_allowed ? "border-primary/40 bg-primary/5" : "hover:bg-muted/50",
                  )}
                >
                  <span className="font-medium">{ROLE_LABELS[r.role] ?? r.role}</span>
                  <Switch
                    checked={r.is_allowed}
                    disabled={rolesSaving}
                    onCheckedChange={(on) => toggleRole(r.role, on)}
                    aria-label={`Allow ${ROLE_LABELS[r.role] ?? r.role} on website`}
                  />
                </label>
              ))}
            </div>
          </section>

          {reviewLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              <PeopleGroup
                title="Waiting for your approval"
                empty="No pending requests."
                people={pending}
                savingId={reviewSavingId}
                allowedRoles={allowedRoles}
                actions={(p) => (
                  <>
                    <Button size="sm" className="gap-1" onClick={() => openApprove(p)} disabled={p.missing.length > 0}>
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openReject(p)}>
                      <X className="h-4 w-4" /> Decline
                    </Button>
                  </>
                )}
              />
              <PeopleGroup
                title="Live on the website"
                empty="Nobody is listed yet — the Our Team page shows a 'coming soon' message."
                people={live}
                savingId={reviewSavingId}
                allowedRoles={allowedRoles}
                actions={(p) => (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openApprove(p)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => runReview(p, "unpublish")}>
                      <EyeOff className="h-4 w-4" /> Remove
                    </Button>
                  </>
                )}
              />

              <div>
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showAll && "rotate-180")} />
                  {showAll ? "Hide" : "Show"} everyone not listed ({others.length})
                </button>
                {showAll && (
                  <div className="mt-3">
                    <PeopleGroup
                      title=""
                      empty="No other team members."
                      people={others}
                      savingId={reviewSavingId}
                      allowedRoles={allowedRoles}
                      actions={() => null}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          {dialog?.kind === "approve" && (
            <>
              <DialogHeader>
                <DialogTitle>Publish {fullName(dialog.person)}</DialogTitle>
                <DialogDescription>
                  Their photo, name, title and NMLS will be visible to anyone on the website.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                {dialog.person.avatar_url && (
                  <img src={dialog.person.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                )}
                <div className="text-sm">
                  <p className="font-semibold">{fullName(dialog.person)}</p>
                  <p className="text-muted-foreground">
                    {ROLE_LABELS[dialog.person.role] ?? dialog.person.role}
                    {dialog.person.license_number ? ` · NMLS #${dialog.person.license_number}` : ""}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pt-title">Public title (optional)</Label>
                  <Input
                    id="pt-title"
                    value={title}
                    maxLength={120}
                    placeholder="e.g. Branch Manager / Sr. Mortgage Advisor"
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pt-order">Display order</Label>
                  <Input
                    id="pt-order"
                    type="number"
                    min={0}
                    max={10000}
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Lower numbers appear first.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
                <Button
                  disabled={!orderValid || reviewSavingId === dialog.person.id}
                  onClick={() =>
                    runReview(dialog.person, "approve", {
                      public_title: title,
                      public_display_order: parsedOrder,
                    })
                  }
                >
                  {reviewSavingId === dialog.person.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Approve & publish
                </Button>
              </DialogFooter>
            </>
          )}
          {dialog?.kind === "reject" && (
            <>
              <DialogHeader>
                <DialogTitle>Decline {fullName(dialog.person)}</DialogTitle>
                <DialogDescription>
                  They'll see this reason and can fix it and request again.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                value={reason}
                maxLength={500}
                rows={3}
                placeholder="e.g. Please use a professional headshot with a plain background."
                onChange={(e) => setReason(e.target.value)}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  disabled={!reason.trim() || reviewSavingId === dialog.person.id}
                  onClick={() => runReview(dialog.person, "reject", { reason: reason.trim() })}
                >
                  Decline request
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PeopleGroup({
  title,
  empty,
  people,
  savingId,
  allowedRoles,
  actions,
}: {
  title: string;
  empty: string;
  people: PublicProfileReviewItem[];
  savingId: number | null;
  allowedRoles: Set<string>;
  actions: (p: PublicProfileReviewItem) => React.ReactNode;
}) {
  return (
    <section>
      {title && <h3 className="mb-3 text-sm font-semibold">{title}</h3>}
      {people.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => {
            const meta = PUBLIC_PROFILE_STATUS_META[p.status];
            return (
              <li
                key={p.id}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border p-3 transition-opacity sm:flex-row sm:items-center",
                  savingId === p.id && "opacity-60",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <ImageOff className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {`${p.first_name} ${p.last_name}`.trim()}
                      <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.className)}>
                        {meta.label}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ROLE_LABELS[p.role] ?? p.role}
                      {p.public_title ? ` · ${p.public_title}` : ""}
                      {p.license_number ? ` · NMLS #${p.license_number}` : ""}
                      {!allowedRoles.has(p.role) ? " · role not allowed" : ""}
                    </p>
                    {p.missing.length > 0 && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-amber-700">
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {p.missing.map((m) => PUBLIC_PROFILE_REQUIREMENT_LABELS[m]).join(" · ")}
                      </p>
                    )}
                    {p.status === "rejected" && p.rejection_reason && (
                      <p className="mt-1 text-xs text-muted-foreground">Declined: {p.rejection_reason}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">{actions(p)}</div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default PublicTeamManager;

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock, Globe, Loader2, XCircle } from "lucide-react";
import {
  NMLS_REQUIRED_ROLES,
  PUBLIC_PROFILE_REQUIREMENT_LABELS,
  type PublicProfileRequirement,
} from "@shared/public-team";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchMyPublicProfile,
  requestPublicProfile,
  withdrawPublicProfile,
} from "@/store/slices/publicTeamSlice";
import { PUBLIC_PROFILE_STATUS_META } from "@/components/PublicTeamManager";

const CHECKLIST: PublicProfileRequirement[] = ["photo", "nmls", "role", "active"];

/** "Website listing" card on the signed-in team member's profile page. */
export function PublicProfileListingCard({
  role,
  avatarUrl,
  licenseNumber,
}: {
  role?: string | null;
  /** Passed so the checklist refreshes after the user edits their profile. */
  avatarUrl?: string | null;
  licenseNumber?: string | null;
}) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { myProfile, myProfileLoading, mySubmitting } = useAppSelector(
    (state) => state.publicTeam,
  );
  const [title, setTitle] = useState("");

  useEffect(() => {
    dispatch(fetchMyPublicProfile());
  }, [dispatch, avatarUrl, licenseNumber]);

  useEffect(() => {
    setTitle(myProfile?.public_title ?? "");
  }, [myProfile?.public_title]);

  if (!myProfile) {
    return myProfileLoading ? (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    ) : null;
  }

  // Roles the owner hasn't enabled don't need to see this card at all.
  if (!myProfile.role_allowed && myProfile.status === "none") return null;

  const meta = PUBLIC_PROFILE_STATUS_META[myProfile.status];
  const ready = myProfile.missing.length === 0;
  const needsNmls = (NMLS_REQUIRED_ROLES as readonly string[]).includes(role ?? "");
  const visibleChecks = CHECKLIST.filter((c) => {
    if (c === "photo") return true;
    if (c === "nmls") return needsNmls;
    return myProfile.missing.includes(c); // role / active only when blocking
  });

  const submit = async () => {
    const result = await dispatch(requestPublicProfile({ public_title: title.trim() }));
    toast(
      requestPublicProfile.fulfilled.match(result)
        ? { title: "Request sent", description: "A platform owner will review your profile." }
        : { title: "Could not send request", description: result.payload as string, variant: "destructive" },
    );
  };
  const withdraw = async () => {
    const result = await dispatch(withdrawPublicProfile());
    if (withdrawPublicProfile.rejected.match(result)) {
      toast({ title: "Could not update", description: result.payload as string, variant: "destructive" });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Globe className="h-4 w-4 text-primary" />
          Website listing
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.className)}>
            {meta.label}
          </span>
        </CardTitle>
        <CardDescription>
          Appear on the public Our Team page. A platform owner approves every listing, and
          changing your photo or NMLS sends it back for review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1.5">
          {visibleChecks.map((c) => {
            const done = !myProfile.missing.includes(c);
            return (
              <li key={c} className={cn("flex items-center gap-2 text-sm", done ? "text-foreground" : "text-amber-700")}>
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                {done
                  ? { photo: "Profile photo uploaded", nmls: "NMLS number added", role: "Role allowed", active: "Account active" }[c]
                  : PUBLIC_PROFILE_REQUIREMENT_LABELS[c]}
              </li>
            );
          })}
        </ul>

        {myProfile.status === "pending" && (
          <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Clock className="h-4 w-4 shrink-0" /> Waiting for a platform owner to approve.
          </p>
        )}
        {myProfile.status === "rejected" && myProfile.rejection_reason && (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {myProfile.rejection_reason}
          </p>
        )}

        {(myProfile.status === "none" || myProfile.status === "rejected") && (
          <div className="space-y-1.5">
            <Label htmlFor="public-title">Public title (optional)</Label>
            <Input
              id="public-title"
              value={title}
              maxLength={120}
              placeholder="e.g. Sr. Loan Officer"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(myProfile.status === "none" || myProfile.status === "rejected") && (
            <Button onClick={submit} disabled={!ready || mySubmitting} className="gap-2">
              {mySubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {myProfile.status === "rejected" ? "Request again" : "Request to appear on website"}
            </Button>
          )}
          {(myProfile.status === "pending" || myProfile.status === "approved") && (
            <Button variant="outline" onClick={withdraw} disabled={mySubmitting}>
              {myProfile.status === "pending" ? "Cancel request" : "Remove me from website"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PublicProfileListingCard;

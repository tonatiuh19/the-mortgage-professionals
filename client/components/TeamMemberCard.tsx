import { useState } from "react";
import { Link } from "react-router-dom";
import { Award, CalendarDays, FileText, ShieldCheck } from "lucide-react";
import type { PublicTeamMember } from "@shared/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const fullName = (m: PublicTeamMember) => `${m.first_name} ${m.last_name}`.trim();

/** Approved team member card for the public website (Our Team + homepage). */
export function TeamMemberCard({
  member,
  className,
  style,
}: {
  member: PublicTeamMember;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const name = fullName(member);

  return (
    <>
      <article
        style={style}
        className={cn(
          "group relative flex flex-col items-center overflow-hidden rounded-2xl border border-border/60 bg-card pb-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-500",
          className,
        )}
      >
        <div className="h-24 w-full bg-gradient-to-r from-primary to-primary/80" />
        <img
          src={member.avatar_url}
          alt={`Photo of ${name}`}
          loading="lazy"
          className="-mt-16 h-32 w-32 rounded-full border-4 border-card object-cover shadow-md transition-transform duration-300 group-hover:scale-105"
        />
        <h3 className="mt-4 px-4 text-lg font-bold text-foreground">{name}</h3>
        <p className="mt-1 px-4 text-sm font-medium text-primary">{member.title}</p>
        {member.nmls && (
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            NMLS #{member.nmls}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-4 min-w-28"
          onClick={() => setOpen(true)}
          aria-label={`View ${name}'s profile`}
        >
          Profile
        </Button>
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader className="items-center text-center sm:text-center">
            <img
              src={member.avatar_url}
              alt=""
              className="h-28 w-28 rounded-full border-4 border-primary/10 object-cover shadow"
            />
            <DialogTitle className="pt-2 text-2xl">{name}</DialogTitle>
            <DialogDescription className="font-medium text-primary">
              {member.title}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap justify-center gap-2 text-xs">
            {member.nmls && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> NMLS #{member.nmls}
              </span>
            )}
            {member.years_experience ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 font-medium">
                <Award className="h-3.5 w-3.5 text-primary" />
                {member.years_experience}+ years experience
              </span>
            ) : null}
          </div>

          {member.bio && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {member.bio}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild className="gap-2">
              <Link to={`/apply/${encodeURIComponent(member.link_key)}`}>
                <FileText className="h-4 w-4" /> Apply with {member.first_name}
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to={`/scheduler/${encodeURIComponent(member.link_key)}`}>
                <CalendarDays className="h-4 w-4" /> Book a call
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TeamMemberCardSkeleton() {
  return (
    <div className="flex flex-col items-center overflow-hidden rounded-2xl border border-border/60 pb-6">
      <Skeleton className="h-24 w-full rounded-none" />
      <Skeleton className="-mt-16 h-32 w-32 rounded-full border-4 border-card" />
      <Skeleton className="mt-4 h-5 w-40" />
      <Skeleton className="mt-2 h-4 w-28" />
      <Skeleton className="mt-4 h-8 w-28" />
    </div>
  );
}

export default TeamMemberCard;

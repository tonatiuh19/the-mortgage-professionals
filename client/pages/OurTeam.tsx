import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetaHelmet } from "@/components/MetaHelmet";
import {
  TeamMemberCard,
  TeamMemberCardSkeleton,
} from "@/components/TeamMemberCard";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPublicTeam } from "@/store/slices/publicTeamSlice";

const OurTeam: React.FC = () => {
  const dispatch = useAppDispatch();
  const { members, membersStatus } = useAppSelector((state) => state.publicTeam);

  useEffect(() => {
    dispatch(fetchPublicTeam());
  }, [dispatch]);

  const loading = membersStatus === "idle" || membersStatus === "loading";

  return (
    <div className="flex flex-col">
      <MetaHelmet
        title="Our Team | The Mortgage Professionals"
        description="Meet the mortgage professionals who help families with purchase and refinance solutions."
        keywords="Our Team, mortgage advisors, loan officers, The Mortgage Professionals"
      />

      <section className="bg-gradient-to-b from-primary/5 to-background py-14 md:py-20">
        <div className="container max-w-4xl">
          <Badge className="border-primary/20 bg-primary/10 text-primary">
            Our Team
          </Badge>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            Meet The Team
          </h1>
          <p className="mt-4 text-muted-foreground">
            Our staff is made up of seasoned mortgage professionals focused on
            trustworthy guidance, proactive communication, and an efficient loan
            process.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        {loading ? (
          <div className="container grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <TeamMemberCardSkeleton key={i} />
            ))}
          </div>
        ) : members.length > 0 ? (
          <div className="container grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member, i) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}
              />
            ))}
          </div>
        ) : (
          <div className="container max-w-xl">
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-xl font-bold">
                Team profiles are coming soon
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Our licensed mortgage professionals are ready to help today.
                Reach out and we&apos;ll connect you with the right advisor.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <Link to="/contact-us">Talk to an expert</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/apply">Apply online</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default OurTeam;

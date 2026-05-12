import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MetaHelmet } from "@/components/MetaHelmet";

const teamMembers = [
  {
    name: "Raul Oseguera",
    role: "Branch Manager / Sr. Mortgage Advisor",
    nmls: "NMLS#260026",
  },
  {
    name: "Yuri Picazo",
    role: "Production Manager / Sr. Loan Officer",
    nmls: "NMLS#645946",
  },
  { name: "Jennifer Benitez", role: "Loan Officer", nmls: "NMLS#1788437" },
  { name: "Yesenia Rodriguez", role: "Loan Officer", nmls: "NMLS#1463246" },
  { name: "Karla Rivas", role: "Loan Officer", nmls: "NMLS#1998739" },
  { name: "Armando Fernandez", role: "Loan Officer", nmls: "NMLS#2161748" },
  { name: "Arthur Pacheco", role: "Loan Officer", nmls: "NMLS#2129887" },
];

const OurTeam: React.FC = () => {
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
        <div className="container grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => (
            <Card key={member.name} className="border-border/60">
              <CardContent className="p-5">
                <h2 className="text-lg font-bold">{member.name}</h2>
                <p className="mt-1 text-sm font-medium text-primary">
                  {member.role}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                  {member.nmls}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default OurTeam;

import React from "react";
import { LucideIcon, Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface UnderConstructionProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  features?: string[];
}

const UnderConstruction: React.FC<UnderConstructionProps> = ({
  title,
  description,
  icon: Icon = Construction,
  features = [],
}) => {
  return (
    <section className="py-12 md:py-16">
      <div className="container max-w-4xl">
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="p-8 md:p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <Badge className="mb-3 border-primary/20 bg-primary/10 text-primary">
              Under Construction
            </Badge>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {description}
            </p>

            {features.length > 0 && (
              <ul className="mx-auto mt-8 grid max-w-2xl gap-2 text-left sm:grid-cols-2">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm font-medium"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default UnderConstruction;

import React from "react";
import { Construction, Sparkles, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface UnderConstructionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  features?: string[];
  showBackButton?: boolean;
}

const UnderConstruction: React.FC<UnderConstructionProps> = ({
  title,
  description,
  icon: Icon,
  features,
  showBackButton = true,
}) => {
  const navigate = useNavigate();
  const DisplayIcon = Icon || Construction;

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-3xl w-full text-center">
        {/* Icon Circle */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950/20 dark:to-purple-900/10 flex items-center justify-center">
            <DisplayIcon
              className="h-24 w-24 text-purple-500"
              strokeWidth={1.5}
            />
          </div>
          {!Icon && (
            <Sparkles className="h-8 w-8 text-yellow-500 absolute top-4 right-4 animate-bounce" />
          )}
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
          {title}
        </h1>

        {/* Description */}
        <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          {description ||
            "This awesome feature is under construction and will be available soon!"}
        </p>

        {/* Feature Badges */}
        {features && features.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {features.map((feature, index) => (
              <Badge
                key={index}
                variant="outline"
                className="px-6 py-2.5 text-sm font-medium bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                {feature}
              </Badge>
            ))}
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
          <span>Building something amazing...</span>
        </div>

        {/* Back Button */}
        {showBackButton && (
          <Button
            onClick={() => navigate("/admin")}
            variant="outline"
            size="lg"
            className="px-8"
          >
            Back to Dashboard
          </Button>
        )}
      </div>
    </div>
  );
};

export default UnderConstruction;

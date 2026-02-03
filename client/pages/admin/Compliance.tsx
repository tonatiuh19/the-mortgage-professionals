import React from "react";
import { Shield } from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { adminPageMeta } from "@/lib/seo-helpers";
import UnderConstruction from "../UnderConstruction";

const Compliance = () => {
  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Compliance",
          "Compliance checklists and regulatory tracking",
        )}
      />
      <UnderConstruction
        title="Compliance Management"
        description="Comprehensive compliance checklists and regulatory tracking tools coming soon."
        icon={Shield}
        features={[
          "Checklists",
          "Regulatory Tracking",
          "Document Verification",
          "Audit Trail",
        ]}
      />
    </>
  );
};

export default Compliance;

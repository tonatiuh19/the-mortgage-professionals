import React from "react";
import { Megaphone } from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { adminPageMeta } from "@/lib/seo-helpers";
import UnderConstruction from "../UnderConstruction";

const Marketing = () => {
  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Marketing",
          "Email campaigns and marketing automation",
        )}
      />
      <UnderConstruction
        title="Marketing Center"
        description="Launch email campaigns, track performance metrics, and automate your marketing workflows to generate more leads."
        icon={Megaphone}
        features={["Email Campaigns", "Analytics", "Templates", "Automation"]}
      />
    </>
  );
};

export default Marketing;

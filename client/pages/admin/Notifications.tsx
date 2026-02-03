import React from "react";
import { Bell } from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { adminPageMeta } from "@/lib/seo-helpers";
import UnderConstruction from "../UnderConstruction";

const Notifications = () => {
  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Notifications",
          "Notification management and alert system",
        )}
      />
      <UnderConstruction
        title="Notification Center"
        description="Centralized notification management and alert system coming soon."
        icon={Bell}
        features={[
          "Real-time Alerts",
          "Email Notifications",
          "SMS Alerts",
          "Custom Rules",
        ]}
      />
    </>
  );
};

export default Notifications;

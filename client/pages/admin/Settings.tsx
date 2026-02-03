import React from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { motion } from "framer-motion";
import { MetaHelmet } from "@/components/MetaHelmet";
import { adminPageMeta } from "@/lib/seo-helpers";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();

  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Settings",
          "Configure your account and system preferences",
        )}
      />
      <div className="p-8">
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.7, type: "spring" }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-slate-500/20 to-slate-500/5 blur-3xl rounded-full" />
            <div className="relative rounded-full bg-gradient-to-br from-slate-500/10 to-slate-500/5 p-12 mb-6 border-2 border-slate-500/20">
              <SettingsIcon className="h-20 w-20 text-slate-500 animate-spin-slow" />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4 max-w-md"
          >
            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-500 to-slate-400 bg-clip-text text-transparent">
              Settings & Configuration
            </h2>
            <p className="text-muted-foreground text-lg">
              Customize your workspace, manage team permissions, configure
              integrations, and set up automation rules.
            </p>
            <div className="flex flex-wrap gap-2 justify-center pt-4">
              {[
                "User Management",
                "Integrations",
                "Notifications",
                "Branding",
              ].map((feature, i) => (
                <div
                  key={i}
                  className="px-3 py-1 rounded-full bg-slate-500/10 text-slate-600 text-sm font-medium border border-slate-500/20"
                >
                  {feature}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8"
          >
            <Button variant="outline" onClick={() => navigate("/admin")}>
              Back to Dashboard
            </Button>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Settings;

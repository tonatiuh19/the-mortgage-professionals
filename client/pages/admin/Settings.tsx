import React, { useEffect, useState, useCallback } from "react";
import {
  Settings as SettingsIcon,
  Bell,
  FileCheck2,
  Save,
  RefreshCw,
  CheckCircle2,
  Mail,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { MetaHelmet } from "@/components/MetaHelmet";
import { adminPageMeta } from "@/lib/seo-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchSettings,
  updateSettings,
  selectSettingValue,
} from "@/store/slices/settingsSlice";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

// ─── Animation variants ───────────────────────────────────────────────────────

const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SettingsSection({
  icon: Icon,
  title,
  description,
  accent,
  children,
  index,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={FADE_UP}
    >
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <CardHeader
          className={cn(
            "flex flex-row items-center gap-4 px-6 py-5 border-b border-border/40",
            accent,
          )}
        >
          <div className="p-2.5 rounded-xl bg-white/70 shadow-sm border border-white/50">
            <Icon className="h-5 w-5 text-foreground/70" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-foreground">
              {title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-0.5">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-6">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  icon?: React.ElementType;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 text-sm"
        disabled={disabled}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  icon?: React.ElementType;
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-border/50 bg-background hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="p-1.5 rounded-lg bg-muted/60">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint && (
            <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
          )}
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

function SaveButton({
  isSaving,
  saved,
  disabled,
  onClick,
}: {
  isSaving: boolean;
  saved: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      disabled={isSaving || disabled}
      className={cn(
        "h-9 px-5 text-sm gap-2 transition-all duration-200",
        saved
          ? "bg-green-600 hover:bg-green-700 text-white"
          : "bg-primary hover:bg-primary/90 text-primary-foreground",
      )}
    >
      {isSaving ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Saving…
        </>
      ) : saved ? (
        <>
          <CheckCircle2 className="h-3.5 w-3.5" />
          Saved
        </>
      ) : (
        <>
          <Save className="h-3.5 w-3.5" />
          Save Changes
        </>
      )}
    </Button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const Settings = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { settings, isLoading, isSaving } = useAppSelector(
    (state) => state.settings,
  );
  const { user } = useAppSelector((state) => state.brokerAuth);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // Pre-Approval Letter
  const [preApprovalRequireAllTasks, setPreApprovalRequireAllTasks] =
    useState(true);

  // Notifications
  const [enableEmail, setEnableEmail] = useState(true);
  const [enableSms, setEnableSms] = useState(false);

  // Saved flash state
  const [savedSections, setSavedSections] = useState<Set<string>>(new Set());

  // Sync state from fetched settings
  useEffect(() => {
    if (settings.length > 0) {
      setPreApprovalRequireAllTasks(
        selectSettingValue(settings, "pre_approval_require_all_tasks") !==
          "false",
      );
      setEnableEmail(selectSettingValue(settings, "enable_email") !== "false");
      setEnableSms(selectSettingValue(settings, "enable_sms") === "true");
    }
  }, [settings]);

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  const flashSaved = (section: string) => {
    setSavedSections((s) => new Set(s).add(section));
    setTimeout(
      () =>
        setSavedSections((s) => {
          const n = new Set(s);
          n.delete(section);
          return n;
        }),
      2500,
    );
  };

  const handleSave = useCallback(
    async (
      section: string,
      updates: { setting_key: string; setting_value: string }[],
    ) => {
      try {
        await dispatch(updateSettings({ updates })).unwrap();
        await dispatch(fetchSettings());
        flashSaved(section);
        toast({
          title: "Saved",
          description: "Settings updated successfully.",
        });
      } catch (err: any) {
        logger.error("Settings save error:", err);
        toast({
          title: "Error",
          description: String(err),
          variant: "destructive",
        });
      }
    },
    [dispatch, toast],
  );

  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Settings",
          "Configure your workspace and system preferences",
        )}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <SettingsIcon className="h-7 w-7 text-primary" />
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage letter configuration, notifications, and system preferences
            </p>
          </div>
          {!isAdmin && (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 self-start md:self-auto">
              <AlertCircle className="h-3 w-3 mr-1" />
              View only — admin required to edit
            </Badge>
          )}
        </header>

        <div className="max-w-3xl space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Pre-Approval Letter */}
              <SettingsSection
                index={0}
                icon={FileCheck2}
                title="Pre-Approval Letter"
                description="Control how pre-approval letters are generated and issued to clients"
                accent="bg-primary/5"
              >
                <div className="space-y-4">
                  <ToggleRow
                    icon={FileCheck2}
                    label="Require all tasks completed before issuing"
                    hint="Brokers can only generate a letter once every task in the loan pipeline is approved"
                    checked={preApprovalRequireAllTasks}
                    onCheckedChange={setPreApprovalRequireAllTasks}
                    disabled={!isAdmin}
                  />

                  <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/10 bg-primary/5">
                    <FileCheck2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground/70 leading-relaxed">
                      Letters include the company logo, broker photo and
                      signature, approved amount with admin-controlled caps, and
                      are fully HTML-customizable per loan. Clients can receive
                      them as a formatted email that renders like a PDF.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-5 mt-5 border-t border-border/40">
                  <SaveButton
                    isSaving={isSaving}
                    saved={savedSections.has("preapproval")}
                    disabled={!isAdmin}
                    onClick={() =>
                      handleSave("preapproval", [
                        {
                          setting_key: "pre_approval_require_all_tasks",
                          setting_value: preApprovalRequireAllTasks
                            ? "true"
                            : "false",
                        },
                      ])
                    }
                  />
                </div>
              </SettingsSection>

              {/* Notifications */}
              <SettingsSection
                index={1}
                icon={Bell}
                title="Notifications"
                description="Control which communication channels are active for your workspace"
                accent="bg-violet-50/60"
              >
                <div className="space-y-3">
                  <ToggleRow
                    icon={Mail}
                    label="Email notifications"
                    hint="Send transactional emails to clients and brokers"
                    checked={enableEmail}
                    onCheckedChange={setEnableEmail}
                    disabled={!isAdmin}
                  />
                  <ToggleRow
                    icon={MessageSquare}
                    label="SMS notifications"
                    hint="Send SMS alerts via configured provider"
                    checked={enableSms}
                    onCheckedChange={setEnableSms}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="flex justify-end pt-5 mt-5 border-t border-border/40">
                  <SaveButton
                    isSaving={isSaving}
                    saved={savedSections.has("notifications")}
                    disabled={!isAdmin}
                    onClick={() =>
                      handleSave("notifications", [
                        {
                          setting_key: "enable_email",
                          setting_value: enableEmail ? "true" : "false",
                        },
                        {
                          setting_key: "enable_sms",
                          setting_value: enableSms ? "true" : "false",
                        },
                      ])
                    }
                  />
                </div>
              </SettingsSection>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Settings;

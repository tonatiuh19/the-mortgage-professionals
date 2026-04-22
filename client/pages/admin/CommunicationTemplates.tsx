import React, { useEffect, useState } from "react";
import {
  Mail,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Save,
  X,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminPageMeta } from "@/lib/seo-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  fetchSmsTemplates,
  createSmsTemplate,
  updateSmsTemplate,
  deleteSmsTemplate,
  fetchWhatsappTemplates,
  createWhatsappTemplate,
  updateWhatsappTemplate,
  deleteWhatsappTemplate,
} from "@/store/slices/communicationTemplatesSlice";
import type { CommunicationType } from "@shared/api";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNELS: {
  value: CommunicationType;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "email",
    label: "Email",
    icon: <Mail className="h-4 w-4" />,
    color: "text-blue-500",
  },
  {
    value: "sms",
    label: "SMS",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-purple-500",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    icon: <FaWhatsapp className="h-4 w-4" />,
    color: "text-green-500",
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

const CommunicationTemplates = () => {
  const dispatch = useAppDispatch();
  const { emailTemplates, smsTemplates, whatsappTemplates, isLoading } =
    useAppSelector((state) => state.communicationTemplates);
  const { toast } = useToast();

  const [channelTab, setChannelTab] = useState<CommunicationType>("email");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{
    id: number;
    name: string;
    type: CommunicationType;
  } | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewContent, setPreviewContent] = useState("");

  // Email form
  const [emailFormData, setEmailFormData] = useState({
    name: "",
    subject: "",
    body_html: "",
    body_text: "",
    template_type: "custom" as const,
    is_active: true,
  });

  // SMS form
  const [smsFormData, setSmsFormData] = useState({
    name: "",
    body: "",
    template_type: "custom" as string,
    is_active: true,
  });

  // WhatsApp form
  const [waFormData, setWaFormData] = useState({
    name: "",
    body: "",
    template_type: "custom" as string,
    is_active: true,
  });

  useEffect(() => {
    dispatch(fetchEmailTemplates());
    dispatch(fetchSmsTemplates());
    dispatch(fetchWhatsappTemplates());
  }, [dispatch]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const formatLabel = (val: string) =>
    val
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      ["link"],
    ],
  };

  // ── CRUD helpers ────────────────────────────────────────────────────────────

  const openEditor = (type: CommunicationType, template?: any) => {
    setChannelTab(type);
    setEditingTemplate(template ? { ...template, type } : null);
    if (type === "email") {
      setEmailFormData(
        template
          ? {
              name: template.name,
              subject: template.subject,
              body_html: template.body_html,
              body_text: template.body_text || "",
              template_type: template.template_type,
              is_active: template.is_active,
            }
          : {
              name: "",
              subject: "",
              body_html: "",
              body_text: "",
              template_type: "custom",
              is_active: true,
            },
      );
    } else if (type === "sms") {
      setSmsFormData(
        template
          ? {
              name: template.name,
              body: template.body,
              template_type: template.template_type,
              is_active: template.is_active,
            }
          : { name: "", body: "", template_type: "custom", is_active: true },
      );
    } else {
      setWaFormData(
        template
          ? {
              name: template.name,
              body: template.body,
              template_type: template.template_type,
              is_active: template.is_active,
            }
          : { name: "", body: "", template_type: "custom", is_active: true },
      );
    }
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    try {
      const type = editingTemplate?.type || channelTab;
      if (type === "email") {
        if (editingTemplate) {
          await dispatch(
            updateEmailTemplate({ id: editingTemplate.id, ...emailFormData }),
          ).unwrap();
        } else {
          await dispatch(createEmailTemplate(emailFormData)).unwrap();
        }
      } else if (type === "sms") {
        if (smsFormData.body.length > 1600) {
          toast({
            title: "Error",
            description: "SMS body cannot exceed 1600 characters",
            variant: "destructive",
          });
          return;
        }
        if (editingTemplate) {
          await dispatch(
            updateSmsTemplate({ id: editingTemplate.id, ...smsFormData }),
          ).unwrap();
        } else {
          await dispatch(createSmsTemplate(smsFormData)).unwrap();
        }
      } else {
        if (editingTemplate) {
          await dispatch(
            updateWhatsappTemplate({ id: editingTemplate.id, ...waFormData }),
          ).unwrap();
        } else {
          await dispatch(createWhatsappTemplate(waFormData)).unwrap();
        }
      }
      toast({
        title: "Success",
        description: `${formatLabel(type)} template ${editingTemplate ? "updated" : "created"} successfully`,
      });
      setIsEditorOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: number, name: string, type: CommunicationType) => {
    setTemplateToDelete({ id, name, type });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      if (templateToDelete.type === "email") {
        await dispatch(deleteEmailTemplate(templateToDelete.id)).unwrap();
      } else if (templateToDelete.type === "sms") {
        await dispatch(deleteSmsTemplate(templateToDelete.id)).unwrap();
      } else {
        await dispatch(deleteWhatsappTemplate(templateToDelete.id)).unwrap();
      }
      toast({ title: "Success", description: "Template deleted" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to delete template",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  // ── Template card renderer ────────────────────────────────────────────────────

  const renderTemplateCards = (
    templates: any[],
    type: CommunicationType,
    bodyKey: string,
    subText?: (t: any) => string,
  ) =>
    templates.length === 0 ? (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
            {CHANNELS.find((c) => c.value === type)?.icon}
          </div>
          <h3 className="text-lg font-semibold mb-2">
            No {formatLabel(type)} templates yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first template to get started
          </p>
          <Button onClick={() => openEditor(type)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </CardContent>
      </Card>
    ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="group hover:shadow-lg transition-all duration-200"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">
                    {template.name}
                  </CardTitle>
                  {subText && (
                    <CardDescription className="text-xs mt-1 truncate">
                      {subText(template)}
                    </CardDescription>
                  )}
                </div>
                <Badge
                  variant={template.is_active ? "default" : "secondary"}
                  className="ml-2 shrink-0"
                >
                  {template.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Type: {formatLabel(template.template_type || "")}
              </div>
              {type !== "email" && (
                <div className="text-sm line-clamp-3 p-2 bg-muted rounded-md">
                  {template[bodyKey]}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setPreviewContent(template[bodyKey]);
                    setIsPreviewOpen(true);
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEditor(type, template)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(template.id, template.name, type)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Communication Templates",
          "Manage email, SMS and WhatsApp templates",
        )}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <PageHeader
          icon={<MessageSquare className="h-7 w-7 text-primary" />}
          title="Communication Templates"
          description="Manage message templates and automate communications across the loan pipeline"
        />

        {/* ── Templates ────────────────────────────────────────────────────── */}
        <Tabs
          value={channelTab}
          onValueChange={(v) => setChannelTab(v as CommunicationType)}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <TabsList>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email ({emailTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="sms" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS ({smsTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="gap-2">
                <FaWhatsapp className="h-4 w-4" />
                WhatsApp ({whatsappTemplates.length})
              </TabsTrigger>
            </TabsList>
            <Button onClick={() => openEditor(channelTab)} className="gap-2">
              <Plus className="h-4 w-4" />
              New {formatLabel(channelTab)} Template
            </Button>
          </div>

          <TabsContent value="email" className="mt-0">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading email templates…
              </div>
            ) : (
              renderTemplateCards(
                emailTemplates,
                "email",
                "body_html",
                (t) => t.subject,
              )
            )}
          </TabsContent>

          <TabsContent value="sms" className="mt-0">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading SMS templates…
              </div>
            ) : (
              renderTemplateCards(
                smsTemplates,
                "sms",
                "body",
                (t) => `${t.body.length} / 1600 chars`,
              )
            )}
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-0">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading WhatsApp templates…
              </div>
            ) : (
              renderTemplateCards(whatsappTemplates, "whatsapp", "body")
            )}
          </TabsContent>
        </Tabs>

        {/* ── Editor Dialog ── */}
        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {
                  CHANNELS.find(
                    (c) => c.value === (editingTemplate?.type || channelTab),
                  )?.icon
                }
                {editingTemplate ? "Edit" : "New"}{" "}
                {formatLabel(editingTemplate?.type || channelTab)} Template
              </DialogTitle>
              <DialogDescription>
                {(editingTemplate?.type || channelTab) === "email"
                  ? "Rich HTML email template with full formatting support"
                  : (editingTemplate?.type || channelTab) === "sms"
                    ? "Plain-text SMS template (max 1600 characters)"
                    : "WhatsApp message template (supports emoji and *bold* formatting)"}
              </DialogDescription>
            </DialogHeader>

            {/* EMAIL FORM */}
            {(editingTemplate?.type || channelTab) === "email" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={emailFormData.name}
                      onChange={(e) =>
                        setEmailFormData({
                          ...emailFormData,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g., Welcome Email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Template Type</Label>
                    <Select
                      value={emailFormData.template_type}
                      onValueChange={(v: any) =>
                        setEmailFormData({ ...emailFormData, template_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome">Welcome</SelectItem>
                        <SelectItem value="status_update">
                          Status Update
                        </SelectItem>
                        <SelectItem value="document_request">
                          Document Request
                        </SelectItem>
                        <SelectItem value="approval">Approval</SelectItem>
                        <SelectItem value="denial">Denial</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={emailFormData.subject}
                    onChange={(e) =>
                      setEmailFormData({
                        ...emailFormData,
                        subject: e.target.value,
                      })
                    }
                    placeholder="e.g., Your application has been received"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Body (HTML)</Label>
                  <div className="border rounded-md">
                    <ReactQuill
                      theme="snow"
                      value={emailFormData.body_html}
                      onChange={(content) =>
                        setEmailFormData({
                          ...emailFormData,
                          body_html: content,
                        })
                      }
                      modules={quillModules}
                      className="h-64"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pt-16">
                    Variables: {"{{client_name}}"}, {"{{application_id}}"},{" "}
                    {"{{broker_name}}"}, {"{{loan_amount}}"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={emailFormData.is_active}
                    onCheckedChange={(v) =>
                      setEmailFormData({ ...emailFormData, is_active: v })
                    }
                  />
                  <Label>Active</Label>
                </div>
              </div>
            )}

            {/* SMS FORM */}
            {(editingTemplate?.type || channelTab) === "sms" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={smsFormData.name}
                      onChange={(e) =>
                        setSmsFormData({ ...smsFormData, name: e.target.value })
                      }
                      placeholder="e.g., Document Reminder"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Template Type</Label>
                    <Select
                      value={smsFormData.template_type}
                      onValueChange={(v) =>
                        setSmsFormData({ ...smsFormData, template_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="status_update">
                          Status Update
                        </SelectItem>
                        <SelectItem value="document_request">
                          Document Request
                        </SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Message</Label>
                    <span
                      className={cn(
                        "text-xs",
                        smsFormData.body.length > 1600
                          ? "text-destructive font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {smsFormData.body.length} / 1600
                    </span>
                  </div>
                  <Textarea
                    value={smsFormData.body}
                    onChange={(e) =>
                      setSmsFormData({ ...smsFormData, body: e.target.value })
                    }
                    placeholder="Enter your SMS message…"
                    className="h-48 resize-none"
                    maxLength={1600}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variables: {"{{client_name}}"}, {"{{application_id}}"},{" "}
                    {"{{broker_name}}"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={smsFormData.is_active}
                    onCheckedChange={(v) =>
                      setSmsFormData({ ...smsFormData, is_active: v })
                    }
                  />
                  <Label>Active</Label>
                </div>
              </div>
            )}

            {/* WHATSAPP FORM */}
            {(editingTemplate?.type || channelTab) === "whatsapp" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={waFormData.name}
                      onChange={(e) =>
                        setWaFormData({ ...waFormData, name: e.target.value })
                      }
                      placeholder="e.g., Application Update"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Template Type</Label>
                    <Select
                      value={waFormData.template_type}
                      onValueChange={(v) =>
                        setWaFormData({ ...waFormData, template_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="update">Status Update</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={waFormData.body}
                    onChange={(e) =>
                      setWaFormData({ ...waFormData, body: e.target.value })
                    }
                    placeholder={
                      "Hi {{client_name}} 👋\n\nYour application has been updated…"
                    }
                    className="h-48 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports emoji and *bold* text. Variables:{" "}
                    {"{{client_name}}"}, {"{{status}}"}, {"{{broker_name}}"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={waFormData.is_active}
                    onCheckedChange={(v) =>
                      setWaFormData({ ...waFormData, is_active: v })
                    }
                  />
                  <Label>Active</Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {editingTemplate ? "Update" : "Create"} Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Preview Dialog ── */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
            </DialogHeader>
            <div className="border rounded-md p-4 bg-white">
              {previewContent.includes("<") ? (
                <div dangerouslySetInnerHTML={{ __html: previewContent }} />
              ) : (
                <pre className="whitespace-pre-wrap text-sm">
                  {previewContent}
                </pre>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirm ── */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete template?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{templateToDelete?.name}".
                Pipeline step assignments using this template will also be
                removed. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default CommunicationTemplates;

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
import { MetaHelmet } from "@/components/MetaHelmet";
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
} from "@/store/slices/communicationTemplatesSlice";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { cn } from "@/lib/utils";

const CommunicationTemplates = () => {
  const dispatch = useAppDispatch();
  const { emailTemplates, smsTemplates, isLoading } = useAppSelector(
    (state) => state.communicationTemplates,
  );
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"email" | "sms">("email");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{
    id: number;
    name: string;
    type: "email" | "sms";
  } | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewContent, setPreviewContent] = useState("");

  // Email form data
  const [emailFormData, setEmailFormData] = useState({
    name: "",
    subject: "",
    body_html: "",
    body_text: "",
    template_type: "custom" as const,
    is_active: true,
  });

  // SMS form data
  const [smsFormData, setSmsFormData] = useState({
    name: "",
    body: "",
    template_type: "custom" as const,
    is_active: true,
  });

  useEffect(() => {
    dispatch(fetchEmailTemplates());
    dispatch(fetchSmsTemplates());
  }, [dispatch]);

  // Email handlers
  const handleOpenEmailEditor = (template?: any) => {
    setActiveTab("email");
    if (template) {
      setEditingTemplate({ ...template, type: "email" });
      setEmailFormData({
        name: template.name,
        subject: template.subject,
        body_html: template.body_html,
        body_text: template.body_text || "",
        template_type: template.template_type,
        is_active: template.is_active,
      });
    } else {
      setEditingTemplate(null);
      setEmailFormData({
        name: "",
        subject: "",
        body_html: "",
        body_text: "",
        template_type: "custom",
        is_active: true,
      });
    }
    setIsEditorOpen(true);
  };

  const handleSaveEmail = async () => {
    try {
      if (editingTemplate) {
        await dispatch(
          updateEmailTemplate({ id: editingTemplate.id, ...emailFormData }),
        ).unwrap();
        toast({
          title: "Success",
          description: "Email template updated successfully",
        });
      } else {
        await dispatch(createEmailTemplate(emailFormData)).unwrap();
        toast({
          title: "Success",
          description: "Email template created successfully",
        });
      }
      setIsEditorOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to save email template",
        variant: "destructive",
      });
    }
  };

  // SMS handlers
  const handleOpenSmsEditor = (template?: any) => {
    setActiveTab("sms");
    if (template) {
      setEditingTemplate({ ...template, type: "sms" });
      setSmsFormData({
        name: template.name,
        body: template.body,
        template_type: template.template_type,
        is_active: template.is_active,
      });
    } else {
      setEditingTemplate(null);
      setSmsFormData({
        name: "",
        body: "",
        template_type: "custom",
        is_active: true,
      });
    }
    setIsEditorOpen(true);
  };

  const handleSaveSms = async () => {
    try {
      // Validate character limit
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
        toast({
          title: "Success",
          description: "SMS template updated successfully",
        });
      } else {
        await dispatch(createSmsTemplate(smsFormData)).unwrap();
        toast({
          title: "Success",
          description: "SMS template created successfully",
        });
      }
      setIsEditorOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to save SMS template",
        variant: "destructive",
      });
    }
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingTemplate(null);
  };

  const handlePreview = (content: string, type: "email" | "sms") => {
    setPreviewContent(content);
    setIsPreviewOpen(true);
  };

  const handleDelete = (id: number, name: string, type: "email" | "sms") => {
    setTemplateToDelete({ id, name, type });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      if (templateToDelete.type === "email") {
        await dispatch(deleteEmailTemplate(templateToDelete.id)).unwrap();
      } else {
        await dispatch(deleteSmsTemplate(templateToDelete.id)).unwrap();
      }
      toast({
        title: "Success",
        description: `${templateToDelete.type === "email" ? "Email" : "SMS"} template deleted successfully`,
      });
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

  const formatTemplateType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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

  const renderEmailTemplates = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {emailTemplates.map((template) => (
        <Card
          key={template.id}
          className="group hover:shadow-lg transition-shadow"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">
                  {template.name}
                </CardTitle>
                <CardDescription className="text-xs mt-1 truncate">
                  {template.subject}
                </CardDescription>
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
              Type: {formatTemplateType(template.template_type)}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handlePreview(template.body_html, "email")}
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleOpenEmailEditor(template)}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleDelete(template.id, template.name, "email")
                }
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderSmsTemplates = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {smsTemplates.map((template) => (
        <Card
          key={template.id}
          className="group hover:shadow-lg transition-shadow"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">
                  {template.name}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {template.body.length} / 1600 characters
                </CardDescription>
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
              Type: {formatTemplateType(template.template_type)}
            </div>
            <div className="text-sm line-clamp-3 p-2 bg-muted rounded-md">
              {template.body}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handlePreview(template.body, "sms")}
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleOpenSmsEditor(template)}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(template.id, template.name, "sms")}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Communication Templates",
          "Manage email and SMS templates",
        )}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-primary" />
              Communication Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage email and SMS templates for client communications
            </p>
          </div>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "email" | "sms")}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <TabsList>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email Templates ({emailTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="sms" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS Templates ({smsTemplates.length})
              </TabsTrigger>
            </TabsList>
            <Button
              onClick={() => {
                if (activeTab === "email") {
                  handleOpenEmailEditor();
                } else {
                  handleOpenSmsEditor();
                }
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New {activeTab === "email" ? "Email" : "SMS"} Template
            </Button>
          </div>

          <TabsContent value="email" className="mt-0">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading email templates...
              </div>
            ) : emailTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No email templates yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first email template to get started
                  </p>
                  <Button
                    onClick={() => handleOpenEmailEditor()}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Email Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              renderEmailTemplates()
            )}
          </TabsContent>

          <TabsContent value="sms" className="mt-0">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading SMS templates...
              </div>
            ) : smsTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No SMS templates yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first SMS template to get started
                  </p>
                  <Button
                    onClick={() => handleOpenSmsEditor()}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create SMS Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              renderSmsTemplates()
            )}
          </TabsContent>
        </Tabs>

        {/* Editor Dialog */}
        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate
                  ? `Edit ${editingTemplate.type === "email" ? "Email" : "SMS"} Template`
                  : `New ${activeTab === "email" ? "Email" : "SMS"} Template`}
              </DialogTitle>
              <DialogDescription>
                {activeTab === "email"
                  ? "Create email templates with rich HTML formatting"
                  : "Create SMS templates (max 1600 characters)"}
              </DialogDescription>
            </DialogHeader>

            {activeTab === "email" || editingTemplate?.type === "email" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-name">Template Name</Label>
                    <Input
                      id="email-name"
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
                    <Label htmlFor="email-type">Template Type</Label>
                    <Select
                      value={emailFormData.template_type}
                      onValueChange={(value: any) =>
                        setEmailFormData({
                          ...emailFormData,
                          template_type: value,
                        })
                      }
                    >
                      <SelectTrigger id="email-type">
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
                  <Label htmlFor="email-subject">Email Subject</Label>
                  <Input
                    id="email-subject"
                    value={emailFormData.subject}
                    onChange={(e) =>
                      setEmailFormData({
                        ...emailFormData,
                        subject: e.target.value,
                      })
                    }
                    placeholder="e.g., Welcome to Our Platform"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-body">Email Body (HTML)</Label>
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
                  <div className="pt-16">
                    <p className="text-xs text-muted-foreground">
                      Available variables: {"{"}
                      {"{"} first_name {"}"}
                      {"}"}, {"{"}
                      {"{"} last_name {"}"}
                      {"}"}, {"{"}
                      {"{"} application_number {"}"}
                      {"}"}, {"{"}
                      {"{"} loan_amount {"}"}
                      {"}"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="email-active"
                    checked={emailFormData.is_active}
                    onCheckedChange={(checked) =>
                      setEmailFormData({ ...emailFormData, is_active: checked })
                    }
                  />
                  <Label htmlFor="email-active">Template is active</Label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sms-name">Template Name</Label>
                    <Input
                      id="sms-name"
                      value={smsFormData.name}
                      onChange={(e) =>
                        setSmsFormData({ ...smsFormData, name: e.target.value })
                      }
                      placeholder="e.g., Appointment Reminder"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms-type">Template Type</Label>
                    <Select
                      value={smsFormData.template_type}
                      onValueChange={(value: any) =>
                        setSmsFormData({ ...smsFormData, template_type: value })
                      }
                    >
                      <SelectTrigger id="sms-type">
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
                    <Label htmlFor="sms-body">SMS Message</Label>
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
                    id="sms-body"
                    value={smsFormData.body}
                    onChange={(e) =>
                      setSmsFormData({ ...smsFormData, body: e.target.value })
                    }
                    placeholder="Enter your SMS message here..."
                    className="h-48 resize-none"
                    maxLength={1600}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available variables: {"{"}
                    {"{"} first_name {"}"}
                    {"}"}, {"{"}
                    {"{"} last_name {"}"}
                    {"}"}, {"{"}
                    {"{"} application_number {"}"}
                    {"}"}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="sms-active"
                    checked={smsFormData.is_active}
                    onCheckedChange={(checked) =>
                      setSmsFormData({ ...smsFormData, is_active: checked })
                    }
                  />
                  <Label htmlFor="sms-active">Template is active</Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseEditor}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={
                  activeTab === "email" || editingTemplate?.type === "email"
                    ? handleSaveEmail
                    : handleSaveSms
                }
              >
                <Save className="h-4 w-4 mr-2" />
                {editingTemplate ? "Update" : "Create"} Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the template "
                {templateToDelete?.name}". This action cannot be undone.
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

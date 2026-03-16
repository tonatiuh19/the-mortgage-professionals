import React, { useState, useEffect } from "react";
import {
  MessageCircle,
  Send,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Zap,
  User,
  ChevronRight,
  X,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Template {
  id: number;
  name: string;
  template_type: "email" | "sms" | "whatsapp";
  category: string;
  subject?: string | null;
  body: string;
  variables: string[];
}

interface NewConversationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  onSendMessage: (data: {
    communication_type: "email" | "sms" | "whatsapp";
    recipient_phone?: string;
    recipient_email?: string;
    subject?: string;
    body: string;
    message_type: "text" | "template";
    template_id?: number;
  }) => Promise<void>;
  isSending: boolean;
}

type Step = "method" | "template" | "recipient" | "compose" | "preview";

const NewConversationWizard: React.FC<NewConversationWizardProps> = ({
  isOpen,
  onClose,
  templates,
  onSendMessage,
  isSending,
}) => {
  const [currentStep, setCurrentStep] = useState<Step>("method");
  const [conversationMethod, setConversationMethod] = useState<
    "template" | "blank"
  >("template");
  const [communicationType, setCommunicationType] = useState<
    "email" | "sms" | "whatsapp"
  >("sms");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("method");
      setConversationMethod("template");
      setCommunicationType("sms");
      setSelectedTemplate(null);
      setRecipientPhone("");
      setRecipientEmail("");
      setMessageSubject("");
      setMessageBody("");
      setPreviewTemplate(null);
    }
  }, [isOpen]);

  // Update message body when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      setMessageBody(selectedTemplate.body);
      if (selectedTemplate.subject) {
        setMessageSubject(selectedTemplate.subject);
      }
    }
  }, [selectedTemplate]);

  const filteredTemplates = templates.filter(
    (t) => t.template_type === communicationType,
  );

  const handleNext = () => {
    switch (currentStep) {
      case "method":
        if (conversationMethod === "blank") {
          setCurrentStep("recipient");
        } else {
          setCurrentStep("template");
        }
        break;
      case "template":
        setCurrentStep("recipient");
        break;
      case "recipient":
        setCurrentStep("compose");
        break;
      case "compose":
        setCurrentStep("preview");
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case "template":
        setCurrentStep("method");
        break;
      case "recipient":
        if (conversationMethod === "blank") {
          setCurrentStep("method");
        } else {
          setCurrentStep("template");
        }
        break;
      case "compose":
        setCurrentStep("recipient");
        break;
      case "preview":
        setCurrentStep("compose");
        break;
    }
  };

  const handleSend = async () => {
    const data = {
      communication_type: communicationType,
      recipient_phone:
        communicationType !== "email" ? recipientPhone : undefined,
      recipient_email:
        communicationType === "email" ? recipientEmail : undefined,
      subject: communicationType === "email" ? messageSubject : undefined,
      body: messageBody,
      message_type: selectedTemplate
        ? ("template" as const)
        : ("text" as const),
      template_id: selectedTemplate?.id,
    };

    try {
      await onSendMessage(data);
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "method":
        return true;
      case "template":
        return conversationMethod === "blank" || selectedTemplate !== null;
      case "recipient":
        return communicationType === "email"
          ? recipientEmail.trim().length > 0
          : recipientPhone.trim().length > 0;
      case "compose":
        return messageBody.trim().length > 0;
      case "preview":
        return true;
      default:
        return false;
    }
  };

  const getCommunicationIcon = (type: "email" | "sms" | "whatsapp") => {
    switch (type) {
      case "email":
        return <Mail className="h-5 w-5" />;
      case "sms":
        return <MessageSquare className="h-5 w-5" />;
      case "whatsapp":
        return <MessageCircle className="h-5 w-5" />;
      default:
        return <MessageCircle className="h-5 w-5" />;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "method":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Choose Communication Method
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {(["sms", "whatsapp", "email"] as const).map((type) => (
                  <Card
                    key={type}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md",
                      communicationType === type
                        ? "ring-2 ring-blue-500 bg-blue-50"
                        : "hover:bg-gray-50",
                    )}
                    onClick={() => setCommunicationType(type)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="flex flex-col items-center space-y-2">
                        {getCommunicationIcon(type)}
                        <span className="text-sm font-medium capitalize">
                          {type}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">
                How would you like to start?
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    conversationMethod === "template"
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : "hover:bg-gray-50",
                  )}
                  onClick={() => setConversationMethod("template")}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Use Template</h4>
                        <p className="text-sm text-gray-600">
                          Choose from pre-made templates
                        </p>
                        <Badge className="mt-2 bg-green-100 text-green-800">
                          Recommended
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    conversationMethod === "blank"
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : "hover:bg-gray-50",
                  )}
                  onClick={() => setConversationMethod("blank")}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Zap className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Start Blank</h4>
                        <p className="text-sm text-gray-600">
                          Write a custom message
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      case "template":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Choose a {communicationType.toUpperCase()} Template
              </h3>
              <Badge variant="outline">
                {filteredTemplates.length} available
              </Badge>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {templates.length === 0 ? (
                  // No templates at all for the tenant
                  <div className="text-center py-12 text-gray-500">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <FileText className="h-10 w-10 text-blue-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      No Templates Created Yet
                    </h4>
                    <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                      Create reusable message templates to save time and ensure
                      consistent communication with your clients.
                    </p>
                    <div className="space-y-3">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-primary from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                        onClick={() => {
                          // TODO: Navigate to template management or creation
                          console.log("Navigate to template creation");
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Create Your First Template
                      </Button>
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConversationMethod("blank")}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Create blank message instead
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  // Templates exist but none for this communication type
                  <div className="text-center py-8 text-gray-500">
                    <div className="bg-orange-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      {getCommunicationIcon(communicationType)}
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      No {communicationType.toUpperCase()} Templates
                    </h4>
                    <p className="text-gray-600 mb-4">
                      You have templates for other communication types, but none
                      for {communicationType} yet.
                    </p>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => {
                          // TODO: Navigate to template creation for this specific type
                          console.log(`Create ${communicationType} template`);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Create {communicationType.toUpperCase()} Template
                      </Button>
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConversationMethod("blank")}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Create blank message instead
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md",
                        selectedTemplate?.id === template.id
                          ? "ring-2 ring-blue-500 bg-blue-50"
                          : "hover:bg-gray-50",
                      )}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold">{template.name}</h4>
                              <Badge className="text-xs">
                                {template.category}
                              </Badge>
                            </div>
                            {/* Description removed as not available in ConversationTemplate */}
                            <p className="text-xs text-gray-500 truncate">
                              {template.body.substring(0, 100)}...
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTemplate(template);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );

      case "recipient":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Who are you messaging?</span>
            </h3>

            {communicationType === "email" ? (
              <div>
                <Label htmlFor="recipientEmail">Email Address</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  placeholder="client@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="recipientPhone">Phone Number</Label>
                <Input
                  id="recipientPhone"
                  placeholder="+1 (555) 123-4567"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {selectedTemplate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Using template: {selectedTemplate.name}
                  </span>
                </div>
                {/* Description removed as not available in ConversationTemplate */}
              </div>
            )}
          </div>
        );

      case "compose":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Compose Your Message</h3>

            {communicationType === "email" && (
              <div>
                <Label htmlFor="messageSubject">Subject</Label>
                <Input
                  id="messageSubject"
                  placeholder="Message subject"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="messageBody">Message</Label>
              <Textarea
                id="messageBody"
                placeholder="Type your message..."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="mt-1 min-h-[200px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                {messageBody.length} characters
              </p>
            </div>

            {selectedTemplate &&
              selectedTemplate.variables &&
              selectedTemplate.variables.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-900 mb-2">
                    Template Variables
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variables.map((variable) => (
                      <Badge
                        key={variable}
                        className="bg-amber-100 text-amber-800"
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    Variables will be automatically filled when the message is
                    sent
                  </p>
                </div>
              )}
          </div>
        );

      case "preview":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review Your Message</h3>

            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getCommunicationIcon(communicationType)}
                  <span className="font-medium capitalize">
                    {communicationType}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    {communicationType === "email"
                      ? recipientEmail
                      : recipientPhone}
                  </span>
                </div>
                {selectedTemplate && (
                  <Badge className="bg-blue-100 text-blue-800">
                    Template: {selectedTemplate.name}
                  </Badge>
                )}
              </div>

              {communicationType === "email" && messageSubject && (
                <div className="mb-3">
                  <Label className="text-xs text-gray-500">Subject</Label>
                  <p className="font-medium">{messageSubject}</p>
                </div>
              )}

              <div>
                <Label className="text-xs text-gray-500">Message</Label>
                <div className="bg-white rounded border p-3 mt-1 max-h-[200px] overflow-y-auto">
                  <p className="whitespace-pre-wrap">{messageBody}</p>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">
              Ready to send? Click the send button below.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Start New Conversation</DialogTitle>
                <DialogDescription>
                  Step{" "}
                  {[
                    "method",
                    "template",
                    "recipient",
                    "compose",
                    "preview",
                  ].indexOf(currentStep) + 1}{" "}
                  of {conversationMethod === "blank" ? "4" : "5"}
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <Separator />

          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="p-1">{renderStepContent()}</div>
          </ScrollArea>

          <Separator />

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === "method"}
            >
              Back
            </Button>

            <div className="flex items-center space-x-2">
              {currentStep === "preview" ? (
                <Button
                  onClick={handleSend}
                  disabled={!canProceed() || isSending}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog
        open={previewTemplate !== null}
        onOpenChange={() => setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              {previewTemplate?.name} - {previewTemplate?.category}
            </DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4">
              {previewTemplate.subject && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Subject
                  </Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border mt-1">
                    {previewTemplate.subject}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Message Body
                </Label>
                <ScrollArea className="h-[200px] w-full border rounded mt-1">
                  <div className="p-3 text-sm whitespace-pre-wrap">
                    {previewTemplate.body}
                  </div>
                </ScrollArea>
              </div>

              {previewTemplate &&
                previewTemplate.variables &&
                previewTemplate.variables.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Variables
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {previewTemplate.variables.map((variable) => (
                        <Badge
                          key={variable}
                          variant="outline"
                          className="text-xs"
                        >
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPreviewTemplate(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setSelectedTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600"
                >
                  Use This Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewConversationWizard;

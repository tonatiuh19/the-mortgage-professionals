import React, { useEffect, useState } from "react";
import {
  MessageCircle,
  Send,
  Phone,
  Mail,
  MessageSquare,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Archive,
  Star,
  Tag,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import NewConversationWizard from "@/components/NewConversationWizard";
import { adminPageMeta } from "@/lib/seo-helpers";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchConversationThreads,
  fetchConversationMessages,
  sendMessage,
  fetchConversationTemplates,
  fetchConversationStats,
  setCurrentThread,
  setThreadsFilters,
  markConversationAsRead,
} from "@/store/slices/conversationsSlice";
import { cn } from "@/lib/utils";
import type { ConversationThread, Communication } from "@shared/api";

const Conversations = () => {
  const dispatch = useAppDispatch();
  const {
    threads,
    currentThread,
    messages,
    templates,
    stats,
    isLoadingThreads,
    isLoadingMessages,
    isSendingMessage,
    threadsFilters,
  } = useAppSelector((state) => state.conversations);
  const { toast } = useToast();

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"email" | "sms" | "whatsapp">(
    "sms",
  );
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [messageSubject, setMessageSubject] = useState("");

  // Auto-populate message when template is selected
  useEffect(() => {
    if (selectedTemplate && templates && templates.length > 0) {
      const template = templates.find(
        (t) => t.id.toString() === selectedTemplate,
      );
      if (template) {
        setMessageText(template.body || "");
        if (template.subject && messageType === "email") {
          setMessageSubject(template.subject);
        }
      }
    }
  }, [selectedTemplate, templates, messageType]);

  // Clear template selection when message type changes
  useEffect(() => {
    setSelectedTemplate("");
    setMessageText("");
    setMessageSubject("");
  }, [messageType]);

  // Load initial data
  useEffect(() => {
    dispatch(fetchConversationThreads(threadsFilters));
    dispatch(fetchConversationTemplates(undefined));
    dispatch(fetchConversationStats());
  }, [dispatch]);

  // Handle thread selection
  const handleSelectThread = (thread: ConversationThread) => {
    dispatch(setCurrentThread(thread));
    dispatch(
      fetchConversationMessages({ conversationId: thread.conversation_id }),
    );

    // Mark as read if it has unread messages
    if (thread.unread_count > 0) {
      dispatch(markConversationAsRead(thread.conversation_id));
    }
  };

  // Handle filters
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    dispatch(setThreadsFilters({ search: query }));
    dispatch(fetchConversationThreads({ ...threadsFilters, search: query }));
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    const filters = status === "all" ? {} : { status };
    dispatch(setThreadsFilters(filters));
    dispatch(fetchConversationThreads({ ...threadsFilters, ...filters }));
  };

  const handlePriorityFilter = (priority: string) => {
    setSelectedPriority(priority);
    const filters = priority === "" ? {} : { priority };
    dispatch(setThreadsFilters(filters));
    dispatch(fetchConversationThreads({ ...threadsFilters, ...filters }));
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    try {
      await dispatch(
        sendMessage({
          conversation_id: currentThread?.conversation_id,
          application_id: currentThread?.application_id || undefined,
          client_id: currentThread?.client_id || undefined,
          communication_type: messageType,
          recipient_phone: currentThread?.client_phone || undefined,
          recipient_email: currentThread?.client_email || undefined,
          subject: messageType === "email" ? messageSubject : undefined,
          body: messageText,
          message_type: selectedTemplate ? "template" : "text",
          template_id: selectedTemplate
            ? parseInt(selectedTemplate)
            : undefined,
        }),
      ).unwrap();

      setMessageText("");
      setMessageSubject("");
      setSelectedTemplate("");

      // Refresh messages
      if (currentThread) {
        dispatch(
          fetchConversationMessages({
            conversationId: currentThread.conversation_id,
          }),
        );
      }

      // Refresh threads to update counts
      dispatch(fetchConversationThreads(threadsFilters));

      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to send message",
        variant: "destructive",
      });
    }
  };

  // Handle new conversation
  const handleNewConversation = async (data: {
    communication_type: "email" | "sms" | "whatsapp";
    recipient_phone?: string;
    recipient_email?: string;
    subject?: string;
    body: string;
    message_type: "text" | "template";
    template_id?: number;
  }) => {
    try {
      await dispatch(sendMessage(data)).unwrap();

      // Refresh threads
      dispatch(fetchConversationThreads(threadsFilters));

      toast({
        title: "Success",
        description: "New conversation started",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get communication type icon
  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "whatsapp":
        return <MessageCircle className="h-4 w-4" />;
      case "call":
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  // Format time
  const formatTime = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <MetaHelmet
        {...adminPageMeta(
          "Conversations",
          "Manage client communications via SMS, WhatsApp, and Email",
        )}
      />

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <MessageCircle className="h-8 w-8 text-primary" />
                Conversations
              </h1>
              <p className="text-sm text-slate-600">
                Manage client communications
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsNewConversationOpen(true)}
            className="bg-primary from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md bg-white/70 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Total Conversations
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.total_conversations}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/70 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Active Threads
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.active_conversations}
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/70 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Unread Messages
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.unread_messages}
                    </p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/70 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Today's Messages
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.today_messages}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-280px)]">
          {/* Conversations List */}
          <div className="col-span-4 bg-white/70 backdrop-blur rounded-lg border border-slate-200 shadow-md">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 border-slate-300"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {["all", "active", "archived", "closed"].map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleStatusFilter(status)}
                        className={cn(
                          selectedStatus === status && "bg-blue-50",
                        )}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {["", "low", "normal", "high", "urgent"].map((priority) => (
                      <DropdownMenuItem
                        key={priority}
                        onClick={() => handlePriorityFilter(priority)}
                        className={cn(
                          selectedPriority === priority && "bg-blue-50",
                        )}
                      >
                        {priority
                          ? priority.charAt(0).toUpperCase() + priority.slice(1)
                          : "All Priorities"}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <ScrollArea className="h-[calc(100%-80px)]">
              <div className="p-2">
                {isLoadingThreads ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : threads.length === 0 ? (
                  <div className="text-center p-8 text-slate-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>No conversations found</p>
                  </div>
                ) : (
                  threads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => handleSelectThread(thread)}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-all duration-200 mb-2",
                        "hover:bg-white hover:shadow-sm border border-transparent",
                        currentThread?.conversation_id ===
                          thread.conversation_id
                          ? "bg-blue-50 border-blue-200 shadow-sm"
                          : "hover:border-slate-200",
                      )}
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-sm">
                            {thread.client_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("") || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {thread.client_name || "Unknown Client"}
                            </p>
                            {thread.unread_count > 0 && (
                              <Badge className="bg-red-500 text-white text-xs px-2 py-1">
                                {thread.unread_count}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex items-center space-x-1">
                              {getCommunicationIcon(thread.last_message_type)}
                              <Badge
                                className={cn(
                                  "text-xs",
                                  getPriorityColor(thread.priority),
                                )}
                              >
                                {thread.priority}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 truncate mt-1">
                            {thread.last_message_preview || "No messages yet"}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {thread.last_message_at
                              ? formatTime(thread.last_message_at)
                              : "No date"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Messages Area */}
          <div className="col-span-8 bg-white/70 backdrop-blur rounded-lg border border-slate-200 shadow-md flex flex-col">
            {currentThread ? (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b border-slate-200 bg-white/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
                          {currentThread.client_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("") || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-900">
                          {currentThread.client_name || "Unknown Client"}
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                          {currentThread.client_phone && (
                            <span className="flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{currentThread.client_phone}</span>
                            </span>
                          )}
                          {currentThread.client_email && (
                            <span className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{currentThread.client_email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Star className="h-4 w-4 mr-2" />
                          Mark as Important
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive Thread
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Tag className="h-4 w-4 mr-2" />
                          Add Tags
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p>No messages in this conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages
                        .slice()
                        .reverse()
                        .map((message) => (
                          <div
                            key={message.id}
                            className={cn(
                              "flex",
                              message.direction === "outbound"
                                ? "justify-end"
                                : "justify-start",
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                                message.direction === "outbound"
                                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                                  : "bg-slate-100 text-slate-900",
                              )}
                            >
                              <div className="flex items-center space-x-2 mb-1">
                                {getCommunicationIcon(
                                  message.communication_type,
                                )}
                                <span className="text-xs opacity-75">
                                  {message.created_at
                                    ? formatTime(message.created_at)
                                    : ""}
                                </span>
                              </div>
                              {message.subject && (
                                <p className="font-medium text-sm mb-1">
                                  {message.subject}
                                </p>
                              )}
                              <p className="text-sm">{message.body}</p>
                              {message.status && (
                                <div className="flex items-center space-x-1 mt-1">
                                  <CheckCircle className="h-3 w-3" />
                                  <span className="text-xs opacity-75 capitalize">
                                    {message.status}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-slate-200 bg-white/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Select
                      value={messageType}
                      onValueChange={(value: any) => setMessageType(value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="h-4 w-4" />
                            <span>SMS</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center space-x-2">
                            <MessageCircle className="h-4 w-4" />
                            <span>WhatsApp</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="email">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4" />
                            <span>Email</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {templates && templates.length > 0 && (
                      <Select
                        value={selectedTemplate}
                        onValueChange={(value) => {
                          setSelectedTemplate(value);
                          if (value && templates && templates.length > 0) {
                            const template = templates.find(
                              (t) => t.id.toString() === value,
                            );
                            if (template) {
                              setMessageText(template.body || "");
                              if (template.subject && messageType === "email") {
                                setMessageSubject(template.subject);
                              }
                            }
                          } else {
                            // Clear message when no template is selected
                            setMessageText("");
                            setMessageSubject("");
                          }
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Use template..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">
                            <span className="text-gray-500">No template</span>
                          </SelectItem>
                          {templates &&
                            templates
                              .filter((t) => t.template_type === messageType)
                              .map((template) => (
                                <SelectItem
                                  key={template.id}
                                  value={template.id.toString()}
                                >
                                  <div className="flex items-center space-x-2">
                                    <span>{template.name}</span>
                                    <Badge
                                      className="text-xs"
                                      variant="outline"
                                    >
                                      {template.category}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {messageType === "email" && (
                    <Input
                      placeholder="Subject"
                      value={messageSubject}
                      onChange={(e) => setMessageSubject(e.target.value)}
                      className="mb-2"
                    />
                  )}

                  <div className="flex items-end space-x-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1 min-h-[80px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isSendingMessage || !messageText.trim()}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                    >
                      {isSendingMessage ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium mb-2">
                    Select a conversation
                  </p>
                  <p className="text-sm">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Conversation Wizard */}
      <NewConversationWizard
        isOpen={isNewConversationOpen}
        onClose={() => setIsNewConversationOpen(false)}
        templates={templates}
        onSendMessage={handleNewConversation}
        isSending={isSendingMessage}
      />
    </div>
  );
};

export default Conversations;

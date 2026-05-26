import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Minimize2,
  Maximize2,
  Trash2,
  AlertCircle,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { LiaRobotSolid } from "react-icons/lia";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  toggleChat,
  closeChat,
  clearChat,
  clearChatError,
  sendBrokerMessage,
  sendClientMessage,
} from "@/store/slices/mortgiSlice";
import type { MortgiChatMessage } from "@/store/slices/mortgiSlice";
import { logger } from "@/lib/logger";

// ─── Props ────────────────────────────────────────────────────────────────────

interface MortgiWidgetProps {
  /** Who is using this widget */
  userType: "broker" | "client";
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shrink-0 shadow-sm">
        <LiaRobotSolid className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: MortgiChatMessage }) {
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex items-end gap-2 mb-3", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shrink-0 shadow-sm">
          <LiaRobotSolid className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[82%] px-3.5 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words",
          isUser
            ? "bg-gradient-to-br from-rose-600 to-red-600 text-white rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

// ─── Quick suggestion chips ───────────────────────────────────────────────────

const BROKER_SUGGESTIONS = [
  "Pipeline summary",
  "Overdue tasks",
  "Recent leads",
  "This month's metrics",
];

const CLIENT_SUGGESTIONS = [
  "My loan status",
  "Pending tasks",
  "My documents",
  "Next meeting",
];

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function MortgiWidget({ userType }: MortgiWidgetProps) {
  const dispatch = useAppDispatch();
  const { messages, isTyping, chatError, isOpen } = useAppSelector(
    (s) => s.mortgi,
  );
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions =
    userType === "broker" ? BROKER_SUGGESTIONS : CLIENT_SUGGESTIONS;

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || isTyping) return;
      setInput("");
      dispatch(clearChatError());

      logger.log("[Mortgi] Sending message:", msg);

      if (userType === "broker") {
        dispatch(sendBrokerMessage(msg));
      } else {
        dispatch(sendClientMessage(msg));
      }
    },
    [input, isTyping, userType, dispatch],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    dispatch(clearChat());
  };

  const panelWidth = expanded ? "w-[520px]" : "w-[360px]";

  return (
    <>
      {/* Backdrop — click to close */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mortgi-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[58] bg-black/20 backdrop-blur-[2px]"
            onClick={() => dispatch(closeChat())}
          />
        )}
      </AnimatePresence>

      {/* Right-side sliding panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              "fixed top-0 right-0 h-screen z-[59] bg-background border-l border-border/60 shadow-2xl flex flex-col overflow-hidden",
              panelWidth,
              "max-sm:w-full",
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-gradient-to-r from-rose-600 to-red-700 shrink-0">
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                <LiaRobotSolid className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">
                  Mortgi
                </p>
                <p className="text-[11px] text-white/70">
                  {isTyping ? "Thinking..." : "AI Assistant · Ready"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={handleClear}
                    title="Clear conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 max-sm:hidden"
                  onClick={() => setExpanded((p) => !p)}
                  title={expanded ? "Shrink" : "Expand"}
                >
                  {expanded ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => dispatch(closeChat())}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 px-4 py-4">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full gap-4 py-8"
                >
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-100 to-red-100 dark:from-rose-900/30 dark:to-red-900/30 flex items-center justify-center">
                    <LiaRobotSolid className="h-8 w-8 text-rose-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      Hi! I'm Mortgi
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                      {userType === "broker"
                        ? "Ask me about your pipeline, leads, tasks, or metrics."
                        : "Ask me about your loan status, tasks, or documents."}
                    </p>
                  </div>

                  {/* Quick suggestions */}
                  <div className="flex flex-wrap gap-1.5 justify-center max-w-[280px]">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="text-xs px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}

              {isTyping && <TypingIndicator />}

              {chatError && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2 mb-3"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{chatError}</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input area */}
            <div className="px-3 pb-3 pt-2 border-t border-border/40 shrink-0">
              <div className="flex items-end gap-2 bg-muted/40 rounded-xl border border-border/50 px-3 py-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Mortgi anything…"
                  className="min-h-[36px] max-h-[100px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm p-0 leading-relaxed"
                  rows={1}
                  maxLength={2000}
                  disabled={isTyping}
                />
                <Button
                  size="icon"
                  className={cn(
                    "h-8 w-8 shrink-0 rounded-lg transition-all",
                    input.trim() && !isTyping
                      ? "bg-gradient-to-br from-rose-600 to-red-600 hover:opacity-90 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                >
                  {isTyping ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                Mortgi can make mistakes — verify important info
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right-edge pull tab — docked to the window edge, hidden when panel is open */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="mortgi-tab"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            whileHover={{ x: -6 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => dispatch(toggleChat())}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[60] flex flex-col items-center gap-2 bg-gradient-to-b from-rose-600 to-red-600 px-2 pt-4 pb-3 rounded-l-2xl shadow-xl cursor-pointer select-none"
            aria-label="Open Mortgi AI assistant"
          >
            {messages.length > 0 && (
              <span className="absolute -top-1 -left-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background" />
            )}
            <ChevronLeft className="h-4 w-4 text-white/80" />
            <LiaRobotSolid className="h-5 w-5 text-white" />
            <span
              className="text-[9px] font-bold text-white/80 uppercase tracking-widest"
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
              Mortgi
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

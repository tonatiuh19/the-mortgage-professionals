import React from "react";
import { Phone, PhoneCall, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch } from "@/store/hooks";
import { startOutboundCall } from "@/store/slices/voiceSlice";

interface PhoneLinkProps {
  /** Phone number to display and call */
  phone: string;
  /** Display name used in the CRM call panel */
  clientName?: string | null;
  /** Client ID forwarded to VoiceCallPanel for call logging */
  clientId?: number | null;
  /** Extra className applied to the trigger button */
  className?: string;
  /** When true, renders only the number text without the Phone icon prefix */
  noIcon?: boolean;
}

/**
 * Reusable phone number widget.
 * Clicking the number opens a dropdown with two options:
 *  - "Call from CRM"   → opens VoiceCallPanel overlay
 *  - "Call from phone" → tel: link (native dialer)
 */
const PhoneLink: React.FC<PhoneLinkProps> = ({
  phone,
  clientName,
  clientId,
  className = "",
  noIcon = false,
}) => {
  const dispatch = useAppDispatch();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button
            className={`flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer ${className}`}
          >
            {!noIcon && <Phone className="h-3 w-3 shrink-0" />}
            <span className="hover:underline">{phone}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            onClick={() =>
              dispatch(startOutboundCall({ phone, clientName, clientId }))
            }
          >
            <PhoneCall className="h-3.5 w-3.5 mr-2 text-primary" />
            Call from CRM
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()}>
              <ExternalLink className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Call from phone
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default PhoneLink;

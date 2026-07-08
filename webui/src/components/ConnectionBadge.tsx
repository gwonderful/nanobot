import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { useClient } from "@/providers/ClientProvider";
import type { ConnectionStatus } from "@/lib/types";

const COPY: Record<ConnectionStatus, { tone: string }> = {
  idle: { tone: "connection-badge--idle" },
  connecting: {
    tone: "connection-badge--attention",
  },
  open: {
    tone: "connection-badge--open",
  },
  reconnecting: {
    tone: "connection-badge--attention",
  },
  closed: {
    tone: "connection-badge--idle",
  },
  error: {
    tone: "connection-badge--error",
  },
};

export function ConnectionBadge() {
  const { t } = useTranslation();
  const { client } = useClient();
  const [status, setStatus] = useState<ConnectionStatus>(client.status);

  useEffect(() => client.onStatus(setStatus), [client]);

  const meta = COPY[status];
  const pulsing =
    status === "connecting" ||
    status === "reconnecting" ||
    status === "error";
  const label = t(`connection.${status}`);
  return (
    <span
      className={cn(
        "connection-badge inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
        meta.tone,
      )}
      aria-live="polite"
      role="status"
      title={label}
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        {pulsing && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

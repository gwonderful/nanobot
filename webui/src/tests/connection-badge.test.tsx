import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConnectionBadge } from "@/components/ConnectionBadge";
import { ClientProvider } from "@/providers/ClientProvider";
import type { NanobotClient } from "@/lib/nanobot-client";
import type { ConnectionStatus } from "@/lib/types";

function renderBadge(status: ConnectionStatus) {
  const client = {
    status,
    onStatus: () => () => {},
  };

  render(
    <ClientProvider client={client as unknown as NanobotClient} token="tok">
      <ConnectionBadge />
    </ClientProvider>,
  );
}

describe("ConnectionBadge", () => {
  it("keeps sidebar connection states on neutral theme classes", () => {
    renderBadge("connecting");

    const badge = screen.getByRole("status");

    expect(badge.className).toContain("connection-badge");
    expect(badge.className).not.toMatch(/amber|emerald|blue|orange|purple/i);
  });
});

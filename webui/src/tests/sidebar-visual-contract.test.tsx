import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ConnectionBadge", () => ({
  ConnectionBadge: () => <span data-testid="connection-badge" />,
}));

import { Sidebar } from "@/components/Sidebar";
import { ThreadHeader } from "@/components/thread/ThreadHeader";

function renderSidebar() {
  const noop = vi.fn();
  render(
    <Sidebar
      sessions={[]}
      activeKey={null}
      loading={false}
      onNewChat={noop}
      onSelect={noop}
      onRequestDelete={noop}
      onTogglePin={noop}
      onRequestRename={noop}
      onToggleArchive={noop}
      onToggleGroup={noop}
      onRequestRenameProject={noop}
      onNewChatInProject={noop}
      onOpenSettings={noop}
      onOpenApps={noop}
      onOpenSkills={noop}
      onOpenAutomations={noop}
      onOpenSearch={noop}
      onToggleArchived={noop}
      onCollapse={noop}
      activeUtility="apps"
    />,
  );
}

describe("app chrome visual contract", () => {
  it("keeps the thread header title constrained away from right actions", () => {
    render(
      <ThreadHeader
        title="A very long thread title that should stay inside the same content rail as messages"
        onToggleSidebar={vi.fn()}
        theme="light"
        onToggleTheme={vi.fn()}
      />,
    );

    const title = screen.getByText(/A very long thread title/);
    expect(title).toHaveClass("max-w-[min(49.5rem,calc(100vw-11rem))]");
    expect(title.parentElement).toHaveClass("max-w-full");
    expect(title.parentElement?.parentElement).toHaveClass("flex-1");

    expect(screen.getByRole("button", { name: "Toggle sidebar" })).toHaveClass(
      "rounded-full",
      "focus-visible:ring-2",
    );
    expect(screen.getByRole("button", { name: /Toggle theme/ })).toHaveClass(
      "rounded-full",
      "focus-visible:ring-2",
    );
  });

  it("uses the same rounded focus treatment for sidebar chrome actions", () => {
    renderSidebar();

    const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
    expect(within(sidebar).getByRole("button", { name: "New chat" })).toHaveClass(
      "rounded-full",
      "focus-visible:ring-2",
    );
    expect(within(sidebar).getByRole("button", { name: "Search" })).toHaveClass(
      "rounded-full",
      "focus-visible:ring-2",
    );
    expect(within(sidebar).getByRole("button", { name: "Apps" })).toHaveClass(
      "ring-1",
      "ring-[hsl(var(--brand)/0.18)]",
    );
    expect(within(sidebar).getByRole("button", { name: "Collapse sidebar" })).toHaveClass(
      "rounded-full",
      "focus-visible:ring-2",
    );
  });
});

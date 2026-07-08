import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatList } from "@/components/ChatList";
import { buildSidebarModel } from "@/lib/sidebar-model";
import type { ChatSummary, SidebarStatePayload } from "@/lib/types";

function session(overrides: Partial<ChatSummary>): ChatSummary {
  const chatId = overrides.chatId ?? "chat";
  return {
    key: `websocket:${chatId}`,
    channel: "websocket",
    chatId,
    createdAt: "2026-05-20T10:00:00Z",
    updatedAt: "2026-05-20T10:00:00Z",
    preview: "",
    ...overrides,
  };
}

function sidebarState(overrides: Partial<SidebarStatePayload> = {}): SidebarStatePayload {
  return {
    schema_version: 2,
    pinned_keys: [],
    archived_keys: [],
    title_overrides: {},
    project_name_overrides: {},
    tags_by_key: {},
    collapsed_groups: {},
    view: {
      density: "comfortable",
      show_previews: false,
      show_timestamps: false,
      show_archived: false,
      sort: "updated_desc",
    },
    pinned_project_keys: [],
    removed_project_keys: [],
    explicit_projects: {},
    updated_at: null,
    ...overrides,
  };
}

describe("ChatList", () => {
  it("orders chats by latest session activity by default", () => {
    const sessions = [
      session({
        chatId: "older",
        title: "Older chat",
        updatedAt: "2026-05-21T10:00:00Z",
      }),
      session({
        chatId: "newest",
        title: "Newest chat",
        updatedAt: "2026-05-21T12:00:00Z",
      }),
      session({
        chatId: "middle",
        title: "Middle chat",
        updatedAt: "2026-05-21T11:00:00Z",
      }),
    ];

    render(
      <ChatList
        sessions={sessions}
        activeKey={null}
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
      />,
    );

    const chatsSection = screen.getAllByRole("region")[0];
    const text = chatsSection.textContent ?? "";

    expect(text.indexOf("Newest chat")).toBeLessThan(text.indexOf("Middle chat"));
    expect(text.indexOf("Middle chat")).toBeLessThan(text.indexOf("Older chat"));
  });

  it("groups WebUI chats by workspace project while preserving in-project sorting and activity", () => {
    const sessions = [
      session({
        chatId: "zeta",
        title: "Zeta task",
        updatedAt: "2026-05-20T12:00:00Z",
        workspaceScope: {
          project_path: "/Users/me/nanobot",
          project_name: "nanobot",
          access_mode: "restricted",
        },
      }),
      session({
        chatId: "alpha",
        title: "Alpha task",
        updatedAt: "2026-05-20T11:00:00Z",
        workspaceScope: {
          project_path: "/Users/me/nanobot",
          project_name: "nanobot",
          access_mode: "restricted",
        },
      }),
      session({
        chatId: "bench",
        title: "Bench task",
        updatedAt: "2026-05-21T09:00:00Z",
        workspaceScope: {
          project_path: "/Users/me/nanobot-bench",
          project_name: "nanobot-bench",
          access_mode: "full",
        },
      }),
    ];

    render(
      <ChatList
        sessions={sessions}
        activeKey="websocket:alpha"
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
        sort="title_asc"
        showTimestamps
        runningChatIds={["zeta"]}
      />,
    );

    const nanobotSection = screen.getByRole("region", { name: "nanobot" });
    const nanobotText = nanobotSection.textContent ?? "";

    expect(screen.getByRole("region", { name: "nanobot-bench" })).toBeInTheDocument();
    expect(within(nanobotSection).getByText("Alpha task")).toBeInTheDocument();
    expect(within(nanobotSection).getByText("Zeta task")).toBeInTheDocument();
    expect(nanobotText.indexOf("Alpha task")).toBeLessThan(nanobotText.indexOf("Zeta task"));
    expect(within(nanobotSection).getByLabelText("Agent running")).toBeInTheDocument();
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });

  it("keeps default workspace chats in the Chats section instead of a project folder", () => {
    const sessions = [
      session({
        chatId: "default",
        title: "Default workspace chat",
        updatedAt: "2026-05-21T10:00:00Z",
        workspaceScope: {
          project_path: "/Users/me/.nanobot/workspace",
          project_name: "workspace",
          access_mode: "restricted",
        },
      }),
      session({
        chatId: "project",
        title: "Project chat",
        updatedAt: "2026-05-21T11:00:00Z",
        workspaceScope: {
          project_path: "/Users/me/nanobot",
          project_name: "nanobot",
          access_mode: "restricted",
        },
      }),
    ];

    render(
      <ChatList
        sessions={sessions}
        activeKey="websocket:default"
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
        defaultWorkspacePath="/Users/me/.nanobot/workspace"
        showTimestamps
      />,
    );

    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "nanobot" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "workspace" })).not.toBeInTheDocument();

    const chatsSection = screen.getByRole("region", { name: "Chats" });
    expect(within(chatsSection).getByText("Default workspace chat")).toBeInTheDocument();
    expect(within(chatsSection).queryByText("Project chat")).not.toBeInTheDocument();
  });

  it("renders pinned, workspace, and chats sections from the sidebar model", () => {
    const sessions = [
      session({
        chatId: "project-chat",
        title: "Project chat",
        workspaceScope: {
          project_path: "/Users/me/nanobot",
          project_name: "nanobot",
          access_mode: "restricted",
        },
      }),
      session({
        chatId: "pinned-chat",
        title: "Pinned pure chat",
      }),
      session({
        chatId: "plain-chat",
        title: "Plain chat",
      }),
    ];
    const state = sidebarState({
      pinned_keys: ["websocket:pinned-chat"],
      pinned_project_keys: ["/Users/me/nanobot"],
      explicit_projects: {
        "/Users/me/empty": {
          path: "/Users/me/empty",
          name: "empty",
          created_at: null,
          updated_at: null,
        },
      },
    });
    const sidebarModel = buildSidebarModel({ sessions, sidebarState: state });

    render(
      <ChatList
        sessions={sessions}
        sidebarModel={sidebarModel}
        activeKey={null}
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
      />,
    );

    const pinnedSection = screen.getByRole("region", { name: "Pinned" });
    const workspaceSection = screen.getByRole("region", { name: "Workspace" });
    const chatsSection = screen.getByRole("region", { name: "Chats" });

    expect(within(pinnedSection).getByRole("region", { name: "nanobot" })).toBeInTheDocument();
    expect(within(pinnedSection).getByText("Project chat")).toBeInTheDocument();
    expect(within(pinnedSection).getByText("Pinned pure chat")).toBeInTheDocument();
    expect(within(workspaceSection).getByRole("region", { name: "empty" })).toBeInTheDocument();
    expect(within(workspaceSection).queryByRole("region", { name: "nanobot" })).not.toBeInTheDocument();
    expect(within(chatsSection).getByText("Plain chat")).toBeInTheDocument();
  });

  it("collapses pinned, workspace, and chats sections from their headers", () => {
    const onToggleGroup = vi.fn();
    const sessions = [
      session({
        chatId: "project-chat",
        title: "Project chat",
        workspaceScope: {
          project_path: "/Users/me/nanobot",
          project_name: "nanobot",
          access_mode: "restricted",
        },
      }),
      session({
        chatId: "pinned-chat",
        title: "Pinned pure chat",
      }),
      session({
        chatId: "plain-chat",
        title: "Plain chat",
      }),
    ];
    const state = sidebarState({
      pinned_keys: ["websocket:pinned-chat"],
      pinned_project_keys: ["/Users/me/nanobot"],
      explicit_projects: {
        "/Users/me/empty": {
          path: "/Users/me/empty",
          name: "empty",
          created_at: null,
          updated_at: null,
        },
      },
    });
    const sidebarModel = buildSidebarModel({ sessions, sidebarState: state });

    const { rerender } = render(
      <ChatList
        sessions={sessions}
        sidebarModel={sidebarModel}
        activeKey={null}
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
        onToggleGroup={onToggleGroup}
      />,
    );

    fireEvent.click(
      within(screen.getByRole("region", { name: "Pinned" }))
        .getByRole("button", { name: "Pinned" }),
    );
    fireEvent.click(
      within(screen.getByRole("region", { name: "Workspace" }))
        .getByRole("button", { name: "Workspace" }),
    );
    fireEvent.click(
      within(screen.getByRole("region", { name: "Chats" }))
        .getByRole("button", { name: "Chats" }),
    );

    expect(onToggleGroup).toHaveBeenNthCalledWith(1, "section:pinned");
    expect(onToggleGroup).toHaveBeenNthCalledWith(2, "section:workspace");
    expect(onToggleGroup).toHaveBeenNthCalledWith(3, "section:chats");

    rerender(
      <ChatList
        sessions={sessions}
        sidebarModel={sidebarModel}
        activeKey={null}
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
        onToggleGroup={onToggleGroup}
        collapsedGroups={{
          "section:pinned": true,
          "section:workspace": true,
          "section:chats": true,
        }}
      />,
    );

    const pinnedToggle = within(screen.getByRole("region", { name: "Pinned" }))
      .getByRole("button", { name: "Pinned" });
    const workspaceToggle = within(screen.getByRole("region", { name: "Workspace" }))
      .getByRole("button", { name: "Workspace" });
    const chatsToggle = within(screen.getByRole("region", { name: "Chats" }))
      .getByRole("button", { name: "Chats" });

    expect(pinnedToggle).toHaveAttribute("aria-expanded", "false");
    expect(workspaceToggle).toHaveAttribute("aria-expanded", "false");
    expect(chatsToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Project chat")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "empty" })).not.toBeInTheDocument();
    expect(screen.queryByText("Plain chat")).not.toBeInTheDocument();
  });

  it("exposes workspace and chats header creation actions", () => {
    const onAddProjectRequest = vi.fn();
    const onNewChat = vi.fn();
    const sidebarModel = buildSidebarModel({
      sessions: [],
      sidebarState: sidebarState(),
    });

    render(
      <ChatList
        sessions={[]}
        sidebarModel={sidebarModel}
        activeKey={null}
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
        onAddProjectRequest={onAddProjectRequest}
        onNewChat={onNewChat}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add project" }));
    fireEvent.click(screen.getByRole("button", { name: "New plain chat" }));

    expect(onAddProjectRequest).toHaveBeenCalledTimes(1);
    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  it("shows project menu actions and disables archive for empty projects", async () => {
    const onRequestRenameProject = vi.fn();
    const onToggleProjectPin = vi.fn();
    const onArchiveProject = vi.fn();
    const onRemoveProject = vi.fn();
    const sessions = [
      session({
        chatId: "project-chat",
        title: "Project chat",
        workspaceScope: {
          project_path: "/Users/me/nanobot",
          project_name: "nanobot",
          access_mode: "restricted",
        },
      }),
    ];
    const state = sidebarState({
      explicit_projects: {
        "/Users/me/empty": {
          path: "/Users/me/empty",
          name: "empty",
          created_at: null,
          updated_at: null,
        },
      },
    });
    const sidebarModel = buildSidebarModel({ sessions, sidebarState: state });

    render(
      <ChatList
        sessions={sessions}
        sidebarModel={sidebarModel}
        activeKey={null}
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
        onRequestRenameProject={onRequestRenameProject}
        onToggleProjectPin={onToggleProjectPin}
        onArchiveProject={onArchiveProject}
        onRemoveProject={onRemoveProject}
      />,
    );

    const nanobotSection = screen.getByRole("region", { name: "nanobot" });
    fireEvent.pointerDown(within(nanobotSection).getByLabelText("Chat actions for nanobot"));
    expect(await screen.findByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Pin" }));
    expect(onToggleProjectPin).toHaveBeenCalledWith("/Users/me/nanobot");

    fireEvent.pointerDown(within(nanobotSection).getByLabelText("Chat actions for nanobot"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Archive" }));
    const archiveDialog = await screen.findByRole("alertdialog", { name: "Archive 1 chat?" });
    expect(archiveDialog).toBeInTheDocument();
    expect(archiveDialog).toHaveClass("confirm-dialog-shell");
    expect(archiveDialog.className).not.toMatch(/border-white|rounded-\[24px\]|shadow-\[0_24px_80px/i);
    expect(screen.getByText(/Settings under Archived conversations/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Archive all" }));
    expect(onArchiveProject).toHaveBeenCalledWith("/Users/me/nanobot");

    fireEvent.pointerDown(within(nanobotSection).getByLabelText("Chat actions for nanobot"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Remove from sidebar" }));
    expect(
      await screen.findByText(/disk files will not be deleted/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/chats will not be deleted or archived/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove from sidebar" }));
    expect(onRemoveProject).toHaveBeenCalledWith("/Users/me/nanobot");

    const emptySection = screen.getByRole("region", { name: "empty" });
    fireEvent.pointerDown(within(emptySection).getByLabelText("Chat actions for empty"));
    expect(await screen.findByRole("menuitem", { name: "Archive" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("keeps a chat pin shortcut while leaving archive in the action menu", async () => {
    const onTogglePin = vi.fn();
    const sessions = [
      session({
        chatId: "plain-chat",
        title: "Plain chat",
      }),
    ];
    const sidebarModel = buildSidebarModel({
      sessions,
      sidebarState: sidebarState(),
    });

    render(
      <ChatList
        sessions={sessions}
        sidebarModel={sidebarModel}
        activeKey={null}
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={onTogglePin}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
      />,
    );

    const pinButton = screen.getByRole("button", { name: "Pin Plain chat" });
    expect(pinButton.className).toContain("opacity-100");
    expect(pinButton.className).toContain("sm:opacity-0");
    expect(screen.getByRole("button", { name: "Chat actions for Plain chat" })).toHaveAttribute(
      "title",
      "Chat actions for Plain chat",
    );

    fireEvent.click(pinButton);
    expect(onTogglePin).toHaveBeenCalledWith("websocket:plain-chat");

    fireEvent.pointerDown(screen.getByLabelText("Chat actions for Plain chat"));
    expect(await screen.findByRole("menuitem", { name: "Archive" })).toBeInTheDocument();
  });

  it("can collapse a project group and keeps project rename separate from chat titles", async () => {
    const onToggleGroup = vi.fn();
    const onRequestRenameProject = vi.fn();
    const onNewChatInProject = vi.fn();
    const sessions = [
      session({
        chatId: "alpha",
        title: "Alpha task",
        workspaceScope: {
          project_path: "/Users/me/nanobot",
          project_name: "nanobot",
          access_mode: "restricted",
        },
      }),
    ];

    render(
      <ChatList
        sessions={sessions}
        activeKey="websocket:alpha"
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
        onToggleGroup={onToggleGroup}
        onRequestRenameProject={onRequestRenameProject}
        onNewChatInProject={onNewChatInProject}
        projectNameOverrides={{ "/Users/me/nanobot": "Photos" }}
        collapsedGroups={{ "project:/Users/me/nanobot": true }}
      />,
    );

    const projectSection = screen.getByRole("region", { name: "Photos" });
    const projectToggle = within(projectSection).getByRole("button", { name: "Photos" });

    expect(projectToggle).toHaveAttribute("aria-expanded", "false");
    expect(projectToggle).toHaveAttribute("data-state", "collapsed");
    expect(projectToggle.querySelector("[data-collapse-indicator]")?.getAttribute("class"))
      .toContain("opacity-0");

    fireEvent.click(projectToggle);

    expect(onToggleGroup).toHaveBeenCalledWith("project:/Users/me/nanobot");
    expect(within(projectSection).queryByText("Alpha task")).not.toBeInTheDocument();

    fireEvent.click(
      within(projectSection).getByRole("button", { name: "Start a new chat in Photos" }),
    );
    expect(onNewChatInProject).toHaveBeenCalledWith("/Users/me/nanobot", "Photos");
    expect(onToggleGroup).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(
      within(projectSection).getByLabelText("Chat actions for Photos"),
      { button: 0 },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));

    expect(onRequestRenameProject).toHaveBeenCalledWith("/Users/me/nanobot", "Photos");
  });

  it("hides the updated dot for the active chat", () => {
    const sessions = [
      session({
        chatId: "active",
        title: "Active task",
      }),
      session({
        chatId: "done",
        title: "Done task",
      }),
    ];

    render(
      <ChatList
        sessions={sessions}
        activeKey="websocket:active"
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
        updatedChatIds={["active", "done"]}
      />,
    );

    const updated = screen.getAllByLabelText("New activity");
    expect(updated).toHaveLength(1);
    expect(updated[0].firstElementChild).toHaveClass("h-2", "w-2");
  });

  it("uses the shared sidebar surface classes for active rows and activity indicators", () => {
    const sessions = [
      session({
        chatId: "active",
        title: "Active task",
      }),
      session({
        chatId: "running",
        title: "Running task",
      }),
      session({
        chatId: "updated",
        title: "Updated task",
      }),
    ];

    render(
      <ChatList
        sessions={sessions}
        activeKey="websocket:active"
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
        runningChatIds={["running"]}
        updatedChatIds={["updated"]}
      />,
    );

    const activeRow = screen.getByRole("button", { name: "Active task" }).parentElement;
    expect(activeRow).toHaveClass("sidebar-chat-row", "sidebar-chat-row--active");

    const runningIndicator = screen.getByLabelText("Agent running").firstElementChild;
    const updatedIndicator = screen.getByLabelText("New activity").firstElementChild;

    expect(runningIndicator).toHaveClass("session-activity-indicator__spinner");
    expect(updatedIndicator).toHaveClass("session-activity-indicator__dot");
    expect(`${runningIndicator?.className ?? ""} ${updatedIndicator?.className ?? ""}`)
      .not.toMatch(/blue|orange|amber|#ff/i);
  });

  it("folds long default workspace chats and can show all", () => {
    const sessions = Array.from({ length: 10 }, (_, index) =>
      session({
        chatId: `chat-${index}`,
        title: `Chat ${index}`,
        updatedAt: `2026-05-21T10:${String(index).padStart(2, "0")}:00Z`,
        workspaceScope: {
          project_path: "/Users/me/.nanobot/workspace",
          project_name: "workspace",
          access_mode: "restricted",
        },
      }),
    );
    const onToggleGroup = vi.fn();
    const baseProps = {
      sessions,
      activeKey: null,
      onSelect: vi.fn(),
      onRequestDelete: vi.fn(),
      onTogglePin: vi.fn(),
      onRequestRename: vi.fn(),
      onToggleArchive: vi.fn(),
      onToggleGroup,
      defaultWorkspacePath: "/Users/me/.nanobot/workspace",
    };

    const { rerender } = render(<ChatList {...baseProps} />);
    const chatsSection = screen.getByRole("region", { name: "Chats" });

    expect(within(chatsSection).getByText("Chat 9")).toBeInTheDocument();
    expect(within(chatsSection).getByText("Chat 2")).toBeInTheDocument();
    expect(within(chatsSection).queryByText("Chat 1")).not.toBeInTheDocument();
    expect(within(chatsSection).queryByRole("button", { name: "Show all" })).not.toBeInTheDocument();
    fireEvent.click(within(chatsSection).getByRole("button", { name: "2 hidden chats" }));

    expect(onToggleGroup).toHaveBeenCalledWith("workspace:chats");

    rerender(
      <ChatList
        {...baseProps}
        collapsedGroups={{ "workspace:chats": false }}
      />,
    );

    expect(within(chatsSection).getByText("Chat 0")).toBeInTheDocument();
    expect(within(chatsSection).getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });

  it("sorts Chats section among project groups by recency, not always last", () => {
    const sessions = [
      session({
        chatId: "recent-chat",
        title: "Recent chat",
        updatedAt: "2026-05-21T12:00:00Z",
      }),
      session({
        chatId: "project-a",
        title: "Project A task",
        updatedAt: "2026-05-21T10:00:00Z",
        workspaceScope: {
          project_path: "/Users/me/project-a",
          project_name: "project-a",
          access_mode: "restricted",
        },
      }),
      session({
        chatId: "project-b",
        title: "Project B task",
        updatedAt: "2026-05-21T11:00:00Z",
        workspaceScope: {
          project_path: "/Users/me/project-b",
          project_name: "project-b",
          access_mode: "restricted",
        },
      }),
    ];

    render(
      <ChatList
        sessions={sessions}
        activeKey="websocket:recent-chat"
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
        showTimestamps
      />,
    );

    const allRegions = screen.getAllByRole("region");
    const regionNames = allRegions.map((r) => r.getAttribute("aria-label") ?? r.textContent);

    // The most recently updated conversation ("Recent chat" at 12:00) must be
    // in the first group — Chats should come before both projects.
    const chatsIdx = regionNames.findIndex((n) => n?.includes("Chats"));
    const projAIdx = regionNames.findIndex((n) => n?.includes("project-a"));
    const projBIdx = regionNames.findIndex((n) => n?.includes("project-b"));

    expect(chatsIdx).toBeLessThan(projAIdx);
    expect(chatsIdx).toBeLessThan(projBIdx);
    expect(within(allRegions[chatsIdx]).getByText("Recent chat")).toBeInTheDocument();
  });

  it("keeps one Projects heading when Chats sorts between project groups", () => {
    const sessions = [
      session({
        chatId: "project-a",
        title: "Project A task",
        updatedAt: "2026-05-21T12:00:00Z",
        workspaceScope: {
          project_path: "/Users/me/project-a",
          project_name: "project-a",
          access_mode: "restricted",
        },
      }),
      session({
        chatId: "middle-chat",
        title: "Middle chat",
        updatedAt: "2026-05-21T11:00:00Z",
      }),
      session({
        chatId: "project-b",
        title: "Project B task",
        updatedAt: "2026-05-21T10:00:00Z",
        workspaceScope: {
          project_path: "/Users/me/project-b",
          project_name: "project-b",
          access_mode: "restricted",
        },
      }),
    ];

    render(
      <ChatList
        sessions={sessions}
        activeKey="websocket:middle-chat"
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
        showTimestamps
      />,
    );

    const regionNames = screen
      .getAllByRole("region")
      .map((r) => r.getAttribute("aria-label") ?? "");

    expect(regionNames).toEqual(["project-a", "Chats", "project-b"]);
    expect(screen.getAllByText("Projects")).toHaveLength(1);
  });

  it("keeps Chats last when its latest conversation is older than all projects", () => {
    const sessions = [
      session({
        chatId: "project-a",
        title: "Project A task",
        updatedAt: "2026-05-21T12:00:00Z",
        workspaceScope: {
          project_path: "/Users/me/project-a",
          project_name: "project-a",
          access_mode: "restricted",
        },
      }),
      session({
        chatId: "project-b",
        title: "Project B task",
        updatedAt: "2026-05-21T11:00:00Z",
        workspaceScope: {
          project_path: "/Users/me/project-b",
          project_name: "project-b",
          access_mode: "restricted",
        },
      }),
      session({
        chatId: "old-chat",
        title: "Old chat",
        updatedAt: "2026-05-21T10:00:00Z",
      }),
    ];

    render(
      <ChatList
        sessions={sessions}
        activeKey="websocket:old-chat"
        onSelect={vi.fn()}
        onRequestDelete={vi.fn()}
        onTogglePin={vi.fn()}
        onRequestRename={vi.fn()}
        onToggleArchive={vi.fn()}
        showTimestamps
      />,
    );

    const regionNames = screen
      .getAllByRole("region")
      .map((r) => r.getAttribute("aria-label") ?? "");

    expect(regionNames).toEqual(["project-a", "project-b", "Chats"]);
    expect(screen.getAllByText("Projects")).toHaveLength(1);
  });
});

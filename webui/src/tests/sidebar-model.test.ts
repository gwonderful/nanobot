import { describe, expect, it } from "vitest";

import { buildSidebarModel } from "@/lib/sidebar-model";
import type { ChatSummary, SidebarStatePayload, WorkspaceScopePayload } from "@/lib/types";

function state(overrides: Partial<SidebarStatePayload> = {}): SidebarStatePayload {
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

function scope(path: string, name?: string): WorkspaceScopePayload {
  return {
    project_path: path,
    project_name: name,
    access_mode: "restricted",
    restrict_to_workspace: true,
  };
}

function chat(
  key: string,
  options: {
    title?: string;
    updatedAt?: string;
    workspaceScope?: WorkspaceScopePayload | null;
  } = {},
): ChatSummary {
  return {
    key,
    channel: "websocket",
    chatId: key.replace("websocket:", ""),
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: options.updatedAt ?? "2026-07-02T00:00:00Z",
    title: options.title,
    preview: "",
    workspaceScope: options.workspaceScope ?? null,
  };
}

function keys(sessions: ChatSummary[]): string[] {
  return sessions.map((session) => session.key);
}

describe("buildSidebarModel", () => {
  it("places pure conversations and project sessions in separate collections", () => {
    const model = buildSidebarModel({
      sessions: [
        chat("websocket:pure", { title: "Pure" }),
        chat("websocket:project", {
          title: "Project",
          workspaceScope: scope("/work/core", "Core"),
        }),
      ],
      sidebarState: state(),
    });

    expect(keys(model.conversations)).toEqual(["websocket:pure"]);
    expect(model.workspaceProjects).toHaveLength(1);
    expect(model.workspaceProjects[0]).toMatchObject({
      key: "/work/core",
      path: "/work/core",
      label: "Core",
      isPinned: false,
      isRemoved: false,
    });
    expect(keys(model.workspaceProjects[0]!.sessions)).toEqual(["websocket:project"]);
  });

  it("keeps explicitly added empty projects visible in the workspace", () => {
    const model = buildSidebarModel({
      sessions: [],
      sidebarState: state({
        explicit_projects: {
          "/work/empty": {
            path: "/work/empty",
            name: "Empty",
            created_at: null,
            updated_at: null,
          },
        },
      }),
    });

    expect(model.workspaceProjects).toHaveLength(1);
    expect(model.workspaceProjects[0]).toMatchObject({
      key: "/work/empty",
      label: "Empty",
      isExplicit: true,
    });
    expect(model.workspaceProjects[0]!.sessions).toEqual([]);
  });

  it("moves pinned projects to pinnedProjects without duplicating pinned child chats", () => {
    const model = buildSidebarModel({
      sessions: [
        chat("websocket:project-pinned-chat", {
          workspaceScope: scope("/work/core", "Core"),
        }),
        chat("websocket:pinned-pure", { title: "Pinned pure" }),
      ],
      sidebarState: state({
        pinned_project_keys: ["/work/core"],
        pinned_keys: ["websocket:project-pinned-chat", "websocket:pinned-pure"],
      }),
    });

    expect(model.pinnedProjects.map((project) => project.key)).toEqual(["/work/core"]);
    expect(keys(model.pinnedProjects[0]!.sessions)).toEqual(["websocket:project-pinned-chat"]);
    expect(model.workspaceProjects.map((project) => project.key)).not.toContain("/work/core");
    expect(keys(model.pinnedChats)).toEqual(["websocket:pinned-pure"]);
    expect(keys(model.conversations)).toEqual([]);
  });

  it("hides removed projects from the home sidebar but keeps their archived group", () => {
    const model = buildSidebarModel({
      sessions: [
        chat("websocket:removed-live", {
          workspaceScope: scope("/work/removed", "Removed"),
        }),
        chat("websocket:removed-archived", {
          workspaceScope: scope("/work/removed", "Removed"),
        }),
      ],
      sidebarState: state({
        archived_keys: ["websocket:removed-archived"],
        removed_project_keys: ["/work/removed"],
      }),
    });

    expect(model.workspaceProjects.map((project) => project.key)).not.toContain("/work/removed");
    expect(model.pinnedProjects.map((project) => project.key)).not.toContain("/work/removed");
    expect(keys(model.conversations)).not.toContain("websocket:removed-live");
    expect(model.archivedGroups).toHaveLength(1);
    expect(model.archivedGroups[0]).toMatchObject({
      key: "/work/removed",
      label: "Removed",
      projectPath: "/work/removed",
    });
    expect(keys(model.archivedGroups[0]!.sessions)).toEqual(["websocket:removed-archived"]);
  });

  it("keeps archived-only projects out of the home sidebar but in options and archive groups", () => {
    const model = buildSidebarModel({
      sessions: [
        chat("websocket:archived", {
          workspaceScope: scope("/work/archive", "Archive"),
        }),
      ],
      sidebarState: state({
        archived_keys: ["websocket:archived"],
      }),
    });

    expect(model.workspaceProjects).toEqual([]);
    expect(model.pinnedProjects).toEqual([]);
    expect(model.projectOptions).toEqual([
      expect.objectContaining({
        key: "/work/archive",
        label: "Archive",
        hasUnarchivedSessions: false,
        hasArchivedSessions: true,
      }),
    ]);
    expect(model.archivedGroups.map((group) => group.key)).toEqual(["/work/archive"]);
    expect(model.archivedCount).toBe(1);
  });

  it("treats the default workspace path as a pure conversation rather than a project", () => {
    const model = buildSidebarModel({
      sessions: [
        chat("websocket:default-workspace", {
          workspaceScope: scope("/work/default", "Default"),
        }),
      ],
      sidebarState: state(),
      defaultWorkspacePath: "/work/default/",
    });

    expect(keys(model.conversations)).toEqual(["websocket:default-workspace"]);
    expect(model.workspaceProjects).toEqual([]);
    expect(model.projectOptions).toEqual([]);
  });
});

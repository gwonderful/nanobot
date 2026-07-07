import { describe, expect, it } from "vitest";

import {
  addExplicitProject,
  archiveProject,
  removeProject,
  toggleProjectPin,
  unarchiveChat,
} from "@/lib/sidebar-state-actions";
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

function chat(key: string, workspaceScope?: WorkspaceScopePayload | null): ChatSummary {
  return {
    key,
    channel: "websocket",
    chatId: key.replace("websocket:", ""),
    createdAt: "2026-07-07T00:00:00Z",
    updatedAt: "2026-07-07T00:00:00Z",
    preview: "",
    workspaceScope: workspaceScope ?? null,
  };
}

describe("sidebar state project actions", () => {
  it("adds an explicit project and clears its removed marker", () => {
    const next = addExplicitProject(
      state({ removed_project_keys: ["/work/core"] }),
      scope(" /work/core/ ", " Core "),
    );

    expect(next.removed_project_keys).toEqual([]);
    expect(next.explicit_projects).toEqual({
      "/work/core": {
        path: "/work/core",
        name: "Core",
        created_at: null,
        updated_at: null,
      },
    });
  });

  it("toggles a project pin without touching conversation pins", () => {
    const pinned = toggleProjectPin(
      state({ pinned_keys: ["websocket:a"] }),
      "/work/core/",
    );
    const unpinned = toggleProjectPin(pinned, "/work/core");

    expect(pinned.pinned_project_keys).toEqual(["/work/core"]);
    expect(pinned.pinned_keys).toEqual(["websocket:a"]);
    expect(unpinned.pinned_project_keys).toEqual([]);
    expect(unpinned.pinned_keys).toEqual(["websocket:a"]);
  });

  it("archives all unarchived project chats and keeps the project as explicit", () => {
    const next = archiveProject(
      state({
        pinned_keys: ["websocket:a", "websocket:other"],
        archived_keys: ["websocket:old"],
      }),
      {
        projectKey: "/work/core",
        sessions: [
          chat("websocket:a", scope("/work/core", "Core")),
          chat("websocket:b", scope("/work/core", "Core")),
          chat("websocket:old", scope("/work/core", "Core")),
          chat("websocket:other", scope("/work/other", "Other")),
          chat("websocket:pure"),
        ],
      },
    );

    expect(next.archived_keys).toEqual(["websocket:old", "websocket:a", "websocket:b"]);
    expect(next.pinned_keys).toEqual(["websocket:other"]);
    expect(next.explicit_projects["/work/core"]).toMatchObject({
      path: "/work/core",
      name: "Core",
    });
  });

  it("marks a project as removed and clears project pin state", () => {
    const next = removeProject(
      state({
        pinned_project_keys: ["/work/core", "/work/other"],
        removed_project_keys: ["/work/old"],
      }),
      "/work/core/",
    );

    expect(next.pinned_project_keys).toEqual(["/work/other"]);
    expect(next.removed_project_keys).toEqual(["/work/old", "/work/core"]);
  });

  it("unarchives one chat and restores its removed project", () => {
    const next = unarchiveChat(
      state({
        archived_keys: ["websocket:a", "websocket:b"],
        removed_project_keys: ["/work/core"],
      }),
      chat("websocket:a", scope("/work/core", "Core")),
    );

    expect(next.archived_keys).toEqual(["websocket:b"]);
    expect(next.removed_project_keys).toEqual([]);
    expect(next.explicit_projects["/work/core"]).toMatchObject({
      path: "/work/core",
      name: "Core",
    });
  });
});

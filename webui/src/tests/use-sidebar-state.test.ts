import { describe, expect, it } from "vitest";

import {
  normalizeSidebarState,
  pruneMissingSessions,
} from "@/hooks/useSidebarState";
import type { ChatSummary, SidebarStatePayload } from "@/lib/types";

function chat(key: string): ChatSummary {
  return {
    key,
    channel: "websocket",
    chatId: key.replace("websocket:", ""),
    createdAt: "2026-07-07T00:00:00Z",
    updatedAt: "2026-07-07T00:00:00Z",
    preview: "",
  };
}

describe("sidebar state normalization", () => {
  it("adds project state defaults when loading an older payload", () => {
    const state = normalizeSidebarState({
      schema_version: 1,
      pinned_keys: ["websocket:a"],
      archived_keys: [],
      title_overrides: {},
      project_name_overrides: {},
      tags_by_key: {},
      collapsed_groups: {},
      view: {},
    });

    expect(state.schema_version).toBe(2);
    expect(state.pinned_project_keys).toEqual([]);
    expect(state.removed_project_keys).toEqual([]);
    expect(state.explicit_projects).toEqual({});
  });

  it("cleans project state fields", () => {
    const state = normalizeSidebarState({
      pinned_project_keys: ["/repo", "/repo", "", 1],
      removed_project_keys: ["/old", "", "/old"],
      explicit_projects: {
        "/repo": {
          path: " /repo ",
          name: " Core ",
          created_at: "2026-07-07T00:00:00Z",
          updated_at: 123,
        },
        "/fallback": {
          name: "Fallback",
        },
        "": {
          path: "/ignored",
          name: "Ignored",
        },
        "/bad": "not-object",
      },
      view: {},
    });

    expect(state.pinned_project_keys).toEqual(["/repo"]);
    expect(state.removed_project_keys).toEqual(["/old"]);
    expect(state.explicit_projects).toEqual({
      "/repo": {
        path: "/repo",
        name: "Core",
        created_at: "2026-07-07T00:00:00Z",
        updated_at: null,
      },
      "/fallback": {
        path: "/fallback",
        name: "Fallback",
        created_at: null,
        updated_at: null,
      },
    });
  });
});

describe("sidebar state pruning", () => {
  it("prunes missing session keys without removing explicit project state", () => {
    const state: SidebarStatePayload = {
      schema_version: 2,
      pinned_keys: ["websocket:keep", "websocket:missing"],
      archived_keys: ["websocket:missing-archived"],
      title_overrides: {
        "websocket:keep": "Keep",
        "websocket:missing": "Missing",
      },
      project_name_overrides: {
        "/repo": "Core",
      },
      tags_by_key: {
        "websocket:missing": ["old"],
      },
      collapsed_groups: {
        "/repo": true,
      },
      view: {
        density: "comfortable",
        show_previews: false,
        show_timestamps: false,
        show_archived: false,
        sort: "updated_desc",
      },
      pinned_project_keys: ["/repo"],
      removed_project_keys: ["/old"],
      explicit_projects: {
        "/repo": {
          path: "/repo",
          name: "Core",
          created_at: null,
          updated_at: null,
        },
      },
      updated_at: null,
    };

    const pruned = pruneMissingSessions(state, [chat("websocket:keep")]);

    expect(pruned.pinned_keys).toEqual(["websocket:keep"]);
    expect(pruned.archived_keys).toEqual([]);
    expect(pruned.title_overrides).toEqual({ "websocket:keep": "Keep" });
    expect(pruned.tags_by_key).toEqual({});
    expect(pruned.project_name_overrides).toEqual({ "/repo": "Core" });
    expect(pruned.collapsed_groups).toEqual({ "/repo": true });
    expect(pruned.pinned_project_keys).toEqual(["/repo"]);
    expect(pruned.removed_project_keys).toEqual(["/old"]);
    expect(pruned.explicit_projects).toEqual({
      "/repo": {
        path: "/repo",
        name: "Core",
        created_at: null,
        updated_at: null,
      },
    });
  });
});

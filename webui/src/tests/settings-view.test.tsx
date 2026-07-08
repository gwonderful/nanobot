import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsView } from "@/components/settings/SettingsView";
import { ClientProvider } from "@/providers/ClientProvider";
import type { ChatSummary, SettingsPayload } from "@/lib/types";
import type {
  ArchivedConversationGroup,
  SidebarProjectOption,
} from "@/lib/sidebar-model";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

function mockSettingsFetch(): void {
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
}

function settingsPayload(): SettingsPayload {
  return {
    agent: {
      model: "openai/gpt-4o",
      provider: "auto",
      resolved_provider: "openai",
      has_api_key: true,
      model_preset: "default",
      max_tokens: 8192,
      context_window_tokens: 200000,
      temperature: 0.1,
      reasoning_effort: null,
      timezone: "UTC",
      bot_name: "nanobot",
      bot_icon: "nb",
      tool_hint_max_length: 40,
    },
    personalization: {
      global_agents: {
        path: "C:\\Users\\ai02\\.nanobot\\AGENTS.md",
        content: "Always reply in Chinese.",
        exists: true,
      },
      reasoning_language: "default",
    },
    model_presets: [{
      name: "default",
      label: "Default",
      active: true,
      is_default: true,
      model: "openai/gpt-4o",
      provider: "auto",
      max_tokens: 8192,
      context_window_tokens: 200000,
      temperature: 0.1,
      reasoning_effort: null,
    }],
    providers: [],
    web_search: {
      provider: "duckduckgo",
      api_key_hint: null,
      base_url: null,
      max_results: 5,
      timeout: 30,
      providers: [{ name: "duckduckgo", label: "DuckDuckGo", credential: "none" }],
    },
    web: {
      enable: true,
      proxy: null,
      user_agent: null,
      search: { max_results: 5, timeout: 30 },
      fetch: { use_jina_reader: true },
    },
    image_generation: {
      enabled: false,
      provider: "openrouter",
      provider_configured: false,
      model: "openai/gpt-5.4-image-2",
      default_aspect_ratio: "1:1",
      default_image_size: "1K",
      max_images_per_turn: 4,
      save_dir: "generated",
      providers: [],
    },
    runtime: {
      config_path: "/tmp/config.json",
      workspace_path: "/tmp/workspace",
      gateway_host: "127.0.0.1",
      gateway_port: 18790,
      heartbeat: {
        enabled: true,
        interval_s: 1800,
        keep_recent_messages: 8,
      },
      dream: {
        schedule: "every 2h",
      },
      unified_session: false,
    },
    advanced: {
      restrict_to_workspace: false,
      webui_allow_local_service_access: true,
      webui_default_access_mode: "default",
      private_service_protection_enabled: true,
      ssrf_whitelist_count: 0,
      mcp_server_count: 0,
      exec_enabled: true,
      exec_sandbox: null,
      exec_path_prepend_set: false,
      exec_path_append_set: false,
    },
    requires_restart: false,
  };
}

function autoDynamicProviderPayload(
  options: {
    configured: boolean;
    hasApiKey: boolean;
    apiBase: string | null;
    apiKeyHint: string | null;
  },
): SettingsPayload {
  const base = settingsPayload();
  return {
    ...base,
    agent: {
      ...base.agent,
      model: "companyProxy/gpt-4o",
      provider: "companyProxy",
      resolved_provider: "companyProxy",
      has_api_key: options.hasApiKey,
    },
    model_presets: [
      {
        ...base.model_presets[0],
        model: "companyProxy/gpt-4o",
        provider: "auto",
      },
    ],
    providers: [
      {
        name: "companyProxy",
        label: "Company Proxy",
        configured: options.configured,
        auth_type: "api_key",
        api_key_required: false,
        api_key_hint: options.apiKeyHint,
        api_base: options.apiBase,
        default_api_base: null,
      },
    ],
  };
}

const installedAnyGen = {
  name: "anygen",
  display_name: "AnyGen",
  category: "generation",
  description: "Generate docs, slides, websites and more via AnyGen cloud API",
  requires: "ANYGEN_API_KEY",
  source: "harness",
  entry_point: "cli-anything-anygen",
  install_supported: true,
  installed: true,
  available: true,
  status: "installed",
  logo_url: "https://www.google.com/s2/favicons?domain=anygen.io&sz=64",
  brand_color: "#111827",
  skill_installed: true,
};

function renderSettingsView(
  options: {
    initialSection?:
      | "overview"
      | "apps"
      | "archived"
      | "automations"
      | "advanced"
      | "models"
      | "browser"
      | "personalization";
    initialSettings?: SettingsPayload;
    showSidebar?: boolean;
    onSettingsChange?: (payload: SettingsPayload) => void;
    onNativeEngineRestart?: () => Promise<string>;
    archivedGroups?: ArchivedConversationGroup[];
    archivedCount?: number;
    projectOptions?: SidebarProjectOption[];
    onUnarchiveChat?: (key: string) => void;
    onDeleteArchivedChats?: (keys: string[]) => Promise<void>;
  } = {},
) {
  render(
    <ClientProvider client={{} as never} token="tok">
      <SettingsView
        theme="light"
        initialSection={options.initialSection ?? "apps"}
        initialSettings={options.initialSettings}
        showSidebar={options.showSidebar}
        onToggleTheme={() => {}}
        onBackToChat={() => {}}
        onModelNameChange={() => {}}
        onSettingsChange={options.onSettingsChange}
        onNativeEngineRestart={options.onNativeEngineRestart}
        archivedGroups={options.archivedGroups}
        archivedCount={options.archivedCount}
        projectOptions={options.projectOptions}
        onUnarchiveChat={options.onUnarchiveChat}
        onDeleteArchivedChats={options.onDeleteArchivedChats}
      />
    </ClientProvider>,
  );
}

function archivedChat(
  overrides: Partial<ChatSummary> & Pick<ChatSummary, "key" | "chatId" | "preview">,
): ChatSummary {
  return {
    channel: "websocket",
    createdAt: "2026-07-04T08:00:00Z",
    updatedAt: "2026-07-04T08:00:00Z",
    ...overrides,
  };
}

function sampleArchivedGroups(): ArchivedConversationGroup[] {
  return [
    {
      key: "/Users/test/goose-study",
      label: "goose-study",
      projectPath: "/Users/test/goose-study",
      sessions: [
        archivedChat({
          key: "websocket:goose-a",
          chatId: "goose-a",
          title: "Analyze CLI mismatch",
          preview: "Compare CLI and model behavior",
          updatedAt: "2026-07-04T16:44:00Z",
        }),
        archivedChat({
          key: "websocket:goose-b",
          chatId: "goose-b",
          title: "Add answer detail",
          preview: "Improve answer expansion",
          updatedAt: "2026-07-04T13:02:00Z",
        }),
      ],
    },
    {
      key: "conversations",
      label: "Chats",
      projectPath: null,
      sessions: [
        archivedChat({
          key: "websocket:plain-a",
          chatId: "plain-a",
          title: "Plain archived chat",
          preview: "No project context",
          updatedAt: "2026-06-23T18:05:00Z",
        }),
      ],
    },
  ];
}

describe("SettingsView Apps catalog", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows archived conversations in the settings navigation", () => {
    mockSettingsFetch();
    renderSettingsView({
      initialSection: "overview",
      initialSettings: settingsPayload(),
      archivedGroups: sampleArchivedGroups(),
      archivedCount: 3,
    });

    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    expect(
      within(nav).getByRole("button", { name: "Archived conversations" }),
    ).toBeInTheDocument();
  });

  it("uses the shared elevated styling hooks for the settings sidebar navigation", () => {
    mockSettingsFetch();
    renderSettingsView({
      initialSection: "overview",
      initialSettings: settingsPayload(),
    });

    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    expect(nav).toHaveClass("settings-nav");
    expect(nav.closest("aside")).toHaveClass("settings-sidebar-shell");

    const overview = within(nav).getByRole("button", { name: "Overview" });
    const models = within(nav).getByRole("button", { name: "Models" });
    expect(overview).toHaveClass("settings-nav-item", "settings-nav-item--active");
    expect(models).toHaveClass("settings-nav-item");
    expect(models).not.toHaveClass("settings-nav-item--active");
  });

  it("groups archived conversations and filters only archived rows", async () => {
    mockSettingsFetch();
    renderSettingsView({
      initialSection: "archived",
      initialSettings: settingsPayload(),
      archivedGroups: sampleArchivedGroups(),
      archivedCount: 3,
      projectOptions: [
        {
          key: "/Users/test/goose-study",
          path: "/Users/test/goose-study",
          label: "goose-study",
          shortPath: ".../test/goose-study",
          hasUnarchivedSessions: false,
          hasArchivedSessions: true,
          isExplicit: false,
          isRemoved: false,
        },
      ],
    });

    expect(screen.getByRole("heading", { name: "Archived conversations" })).toBeInTheDocument();
    expect(screen.getByText("goose-study")).toBeInTheDocument();
    expect(screen.getByText("Chats")).toBeInTheDocument();
    expect(screen.getByText("Analyze CLI mismatch")).toBeInTheDocument();
    expect(screen.getByText("Plain archived chat")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search archived chats" }), {
      target: { value: "plain" },
    });

    expect(screen.queryByText("Analyze CLI mismatch")).not.toBeInTheDocument();
    expect(screen.getByText("Plain archived chat")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "All projects" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "goose-study" }));

    expect(screen.queryByText("Plain archived chat")).not.toBeInTheDocument();
    expect(screen.getByText("No archived conversations match your filters.")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "goose-study" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "No project chats" }));

    expect(screen.getByText("Plain archived chat")).toBeInTheDocument();
  });

  it("keeps archived rows non-opening and limits row actions to unarchive and delete", () => {
    mockSettingsFetch();
    const onUnarchiveChat = vi.fn();
    renderSettingsView({
      initialSection: "archived",
      initialSettings: settingsPayload(),
      archivedGroups: sampleArchivedGroups(),
      archivedCount: 3,
      onUnarchiveChat,
    });

    const row = screen.getByText("Analyze CLI mismatch").closest("[data-archived-row]");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).queryByRole("link")).not.toBeInTheDocument();
    expect(within(row as HTMLElement).queryByRole("button", { name: /Open/ })).not.toBeInTheDocument();

    const actions = within(row as HTMLElement).getByRole("group", {
      name: "Actions for Analyze CLI mismatch",
    });
    expect(actions.className).toContain("opacity-100");
    expect(actions.className).toContain("sm:opacity-0");
    expect(actions.className).toContain("group-focus-within:opacity-100");
    const unarchiveButton = within(actions).getByRole("button", {
      name: "Unarchive Analyze CLI mismatch",
    });
    const deleteButton = within(actions).getByRole("button", {
      name: "Delete Analyze CLI mismatch",
    });
    expect(unarchiveButton).toHaveAttribute("title", "Unarchive Analyze CLI mismatch");
    expect(deleteButton).toHaveAttribute("title", "Delete Analyze CLI mismatch");
    expect(within(actions).queryByRole("button", { name: /Pin/ })).not.toBeInTheDocument();
    expect(within(actions).queryByRole("button", { name: /Archive/ })).not.toBeInTheDocument();

    fireEvent.click(unarchiveButton);
    expect(onUnarchiveChat).toHaveBeenCalledWith("websocket:goose-a");
  });

  it("confirms project and global archived deletions without offering bulk unarchive", async () => {
    mockSettingsFetch();
    const onDeleteArchivedChats = vi.fn().mockResolvedValue(undefined);
    renderSettingsView({
      initialSection: "archived",
      initialSettings: settingsPayload(),
      archivedGroups: sampleArchivedGroups(),
      archivedCount: 3,
      onDeleteArchivedChats,
    });

    fireEvent.pointerDown(screen.getByRole("button", {
      name: "More actions for goose-study",
    }));

    expect(
      await screen.findByRole("menuitem", { name: "Delete this project's archived chats" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Unarchive all/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", {
      name: "Delete this project's archived chats",
    }));
    expect(screen.getByRole("heading", {
      name: "Delete this project's archived conversations?",
    })).toBeInTheDocument();
    expect(screen.getByText(/will not delete project files on disk/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete archived conversations" }));

    await waitFor(() =>
      expect(onDeleteArchivedChats).toHaveBeenCalledWith([
        "websocket:goose-a",
        "websocket:goose-b",
      ]),
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete all archived conversations" }));
    expect(screen.getByRole("heading", {
      name: "Delete all archived conversations?",
    })).toBeInTheDocument();
    expect(screen.getByText(/will not delete project files on disk/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete archived conversations" }));

    await waitFor(() =>
      expect(onDeleteArchivedChats).toHaveBeenLastCalledWith([
        "websocket:goose-a",
        "websocket:goose-b",
        "websocket:plain-a",
      ]),
    );
  });

  it("does not show the Settings kicker on the standalone Automations surface", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/settings") return jsonResponse(settingsPayload());
      if (url === "/api/webui/automations") return jsonResponse({ jobs: [] });
      return jsonResponse({});
    }));

    renderSettingsView({
      initialSection: "automations",
      initialSettings: settingsPayload(),
      showSidebar: false,
    });

    expect(screen.getByRole("heading", { name: "Automations" })).toBeInTheDocument();
    expect(await screen.findByText("No automations yet.")).toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("shows and saves global custom instructions in personalization", async () => {
    const updated = {
      ...settingsPayload(),
      personalization: {
        global_agents: {
          path: "C:\\Users\\ai02\\.nanobot\\AGENTS.md",
          content: "Reply in Chinese and think in Chinese.",
          exists: true,
        },
        reasoning_language: "zh" as const,
      },
      requires_restart: true,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/settings") return jsonResponse(settingsPayload());
      if (
        url ===
        "/api/settings/update?global_agents_content=Reply+in+Chinese+and+think+in+Chinese.&reasoning_language=zh"
      ) {
        return jsonResponse(updated);
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettingsView({
      initialSection: "personalization",
      initialSettings: settingsPayload(),
    });

    expect(screen.getByRole("button", { name: "Personalization" })).toBeInTheDocument();
    const textarea = screen.getByLabelText("Custom instructions") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Always reply in Chinese.");

    fireEvent.change(textarea, {
      target: { value: "Reply in Chinese and think in Chinese." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Chinese thinking" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/settings/update?global_agents_content=Reply+in+Chinese+and+think+in+Chinese.&reasoning_language=zh",
        expect.objectContaining({
          headers: { Authorization: "Bearer tok" },
        }),
      );
    });
  });

  it("shows a visible uninstall button for installed CLI apps and calls uninstall", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/settings") {
        return jsonResponse(settingsPayload());
      }
      if (url === "/api/settings/cli-apps") {
        return jsonResponse({
          apps: [installedAnyGen],
          installed_count: 1,
          catalog_updated_at: "2026-04-18",
        });
      }
      if (url === "/api/settings/mcp-presets") {
        return jsonResponse({ presets: [], installed_count: 0 });
      }
      if (url === "/api/settings/cli-apps/uninstall?name=anygen") {
        return jsonResponse({
          apps: [{ ...installedAnyGen, installed: false, status: "available" }],
          installed_count: 0,
          catalog_updated_at: "2026-04-18",
          last_action: {
            ok: true,
            message: "Uninstalled CLI for AnyGen.",
            still_available: false,
          },
        });
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettingsView();

    expect(await screen.findByRole("heading", { name: "Apps" })).toBeInTheDocument();
    expect(await screen.findByText("AnyGen")).toBeInTheDocument();
    const uninstall = screen.getByRole("button", { name: "Uninstall CLI" });

    fireEvent.click(uninstall);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/settings/cli-apps/uninstall?name=anygen",
        expect.objectContaining({
          headers: { Authorization: "Bearer tok" },
        }),
      ),
    );
    expect(await screen.findByText("Uninstalled CLI for AnyGen.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText("Uninstalled CLI for AnyGen.")).not.toBeInTheDocument();
  });

  it("shows nanobot optional features and enables one", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/settings") return jsonResponse(settingsPayload());
      if (url === "/api/settings/cli-apps") return jsonResponse({ apps: [], installed_count: 0 });
      if (url === "/api/settings/mcp-presets") return jsonResponse({ presets: [], installed_count: 0 });
      if (url === "/api/settings/nanobot-features") {
        return jsonResponse({
          features: [{
            name: "matrix",
            display_name: "Matrix",
            type: "channel",
            enabled: false,
            installed: false,
            ready: false,
            status: "missing_dependency",
            install_supported: true,
            requires_restart: true,
          }],
          enabled_count: 0,
        });
      }
      if (url === "/api/settings/nanobot-features/enable?name=matrix") {
        return jsonResponse({
          features: [{
            name: "matrix",
            display_name: "Matrix",
            type: "channel",
            enabled: true,
            installed: true,
            ready: true,
            status: "enabled",
            install_supported: true,
            requires_restart: true,
          }],
          enabled_count: 1,
          last_action: { ok: true, message: "Enabled channel 'matrix'", enabled: true },
        });
      }
      if (url === "/api/settings/nanobot-features/disable?name=matrix") {
        return jsonResponse({
          features: [{
            name: "matrix",
            display_name: "Matrix",
            type: "channel",
            enabled: false,
            installed: true,
            ready: false,
            status: "not_enabled",
            install_supported: true,
            requires_restart: true,
          }],
          enabled_count: 0,
          requires_restart: true,
          last_action: { ok: true, message: "Disabled channel 'matrix'", enabled: false },
        });
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettingsView();

    expect(await screen.findByText("Matrix")).toBeInTheDocument();
    expect(screen.queryByText(/Enabling Nanobot features may install Python packages/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Install support" }));
    expect(screen.getByRole("dialog", { name: "Install support for Matrix?" })).toBeInTheDocument();
    expect(screen.getByText("nanobot will add what Matrix needs, then turn it on. Continue?")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/settings/nanobot-features/enable?name=matrix",
      expect.anything(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Install and enable" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/settings/nanobot-features/enable?name=matrix",
        expect.objectContaining({
          headers: { Authorization: "Bearer tok" },
        }),
      ),
    );
    expect(await screen.findByText("Enabled channel 'matrix'")).toBeInTheDocument();
    expect(screen.getByText("Restart nanobot to apply updated apps and features.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Disable" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/settings/nanobot-features/disable?name=matrix",
        expect.objectContaining({
          headers: { Authorization: "Bearer tok" },
        }),
      ),
    );
    expect(await screen.findByText("Disabled channel 'matrix'")).toBeInTheDocument();
  });

  it("shows enabled nanobot channels with missing support as enabled", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/settings") return jsonResponse(settingsPayload());
      if (url === "/api/settings/cli-apps") return jsonResponse({ apps: [], installed_count: 0 });
      if (url === "/api/settings/mcp-presets") return jsonResponse({ presets: [], installed_count: 0 });
      if (url === "/api/settings/nanobot-features") {
        return jsonResponse({
          features: [{
            name: "matrix",
            display_name: "Matrix",
            type: "channel",
            enabled: true,
            installed: false,
            ready: false,
            status: "missing_dependency",
            install_supported: true,
            requires_restart: true,
          }],
          enabled_count: 1,
        });
      }
      if (url === "/api/settings/nanobot-features/enable?name=matrix") {
        return jsonResponse({
          features: [{
            name: "matrix",
            display_name: "Matrix",
            type: "channel",
            enabled: true,
            installed: true,
            ready: true,
            status: "enabled",
            install_supported: true,
            requires_restart: true,
          }],
          enabled_count: 1,
          last_action: { ok: true, message: "Enabled channel 'matrix'", enabled: true },
        });
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettingsView();

    expect(await screen.findByText("Matrix")).toBeInTheDocument();
    expect(screen.getByText("1 Plugin · 0 CLI · 0 MCP")).toBeInTheDocument();
    expect(screen.getByText("Support missing")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Install support" }));
    fireEvent.click(screen.getByRole("button", { name: "Install and enable" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/settings/nanobot-features/enable?name=matrix",
        expect.objectContaining({
          headers: { Authorization: "Bearer tok" },
        }),
      ),
    );
  });

  it("does not offer to disable the websocket channel", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/settings") return jsonResponse(settingsPayload());
      if (url === "/api/settings/cli-apps") return jsonResponse({ apps: [], installed_count: 0 });
      if (url === "/api/settings/mcp-presets") return jsonResponse({ presets: [], installed_count: 0 });
      if (url === "/api/settings/nanobot-features") {
        return jsonResponse({
          features: [{
            name: "websocket",
            display_name: "Websocket",
            type: "channel",
            enabled: true,
            installed: true,
            ready: true,
            status: "enabled",
            install_supported: true,
            requires_restart: true,
          }],
          enabled_count: 1,
        });
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettingsView();

    expect(await screen.findByText("Websocket")).toBeInTheDocument();
    expect(screen.getByText("Required for WebUI")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Required for WebUI" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/settings/nanobot-features/disable?name=websocket",
      expect.anything(),
    );
  });

  it("publishes the latest settings payload to the shell", async () => {
    const payload = settingsPayload();
    const onSettingsChange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/settings") return jsonResponse(payload);
        if (url === "/api/settings/cli-apps") {
          return jsonResponse({ apps: [], installed_count: 0 });
        }
        if (url === "/api/settings/mcp-presets") {
          return jsonResponse({ presets: [], installed_count: 0 });
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }),
    );

    renderSettingsView({ onSettingsChange });

    await waitFor(() => expect(onSettingsChange).toHaveBeenCalledWith(payload));
  });

  it("does not keep Apps loading while an empty CLI catalog refresh is pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/settings") return jsonResponse(settingsPayload());
        if (url === "/api/settings/cli-apps") {
          return jsonResponse({
            apps: [],
            installed_count: 0,
            catalog_updated_at: null,
            catalog_refresh_pending: true,
          });
        }
        if (url === "/api/settings/mcp-presets") {
          return jsonResponse({ presets: [], installed_count: 0 });
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }),
    );

    renderSettingsView();

    expect(await screen.findByText("No apps match this filter.")).toBeInTheDocument();
    expect(screen.queryByText("Loading Apps...")).not.toBeInTheDocument();
  });

  it("shows token activity on the overview", async () => {
    const payload: SettingsPayload = {
      ...settingsPayload(),
      usage: {
        days: [
          {
            date: "2026-06-03",
            prompt_tokens: 1200,
            completion_tokens: 300,
            cached_tokens: 500,
            total_tokens: 1500,
            requests: 2,
          },
        ],
        total_tokens: 1500,
        total_tokens_30d: 1500,
        total_tokens_365d: 1500,
        peak_day_tokens: 1500,
        current_streak_days: 1,
        longest_streak_days: 1,
        active_days_30d: 1,
        requests_30d: 2,
        updated_at: "2026-06-03T00:00:00Z",
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/settings") return jsonResponse(payload);
        if (url === "/api/settings/cli-apps") {
          return jsonResponse({ apps: [], installed_count: 0 });
        }
        if (url === "/api/settings/mcp-presets") {
          return jsonResponse({ presets: [], installed_count: 0 });
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }),
    );

    renderSettingsView({ initialSection: "overview" });

    expect(await screen.findByLabelText("Token activity")).toBeInTheDocument();
    expect(screen.getByText("Token Usage")).toBeInTheDocument();
    expect(screen.queryByText("Token activity")).not.toBeInTheDocument();
    expect(screen.queryByText("Total tokens")).not.toBeInTheDocument();
    expect(screen.queryByText("Peak tokens")).not.toBeInTheDocument();
  });

  it("aligns token activity days with the configured timezone", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T18:00:00Z"));
    const basePayload = settingsPayload();
    const payload: SettingsPayload = {
      ...basePayload,
      agent: {
        ...basePayload.agent,
        timezone: "Asia/Shanghai",
      },
      usage: {
        days: [
          {
            date: "2026-06-03",
            prompt_tokens: 1200,
            completion_tokens: 300,
            cached_tokens: 500,
            total_tokens: 1500,
            requests: 2,
          },
        ],
        total_tokens: 1500,
        total_tokens_30d: 1500,
        total_tokens_365d: 1500,
        peak_day_tokens: 1500,
        current_streak_days: 1,
        longest_streak_days: 1,
        active_days_30d: 1,
        requests_30d: 2,
        updated_at: "2026-06-03T00:00:00Z",
      },
    };
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));

    renderSettingsView({ initialSection: "overview", initialSettings: payload });

    expect(screen.getByLabelText("2026-06-03: 1.5K tokens, 2 requests")).toBeInTheDocument();
  });

  it("shows context window options in model settings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/settings") return jsonResponse(settingsPayload());
        if (url === "/api/settings/cli-apps") {
          return jsonResponse({ apps: [], installed_count: 0 });
        }
        if (url === "/api/settings/mcp-presets") {
          return jsonResponse({ presets: [], installed_count: 0 });
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }),
    );

    renderSettingsView({ initialSection: "models" });

    expect(await screen.findByText("Context window")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "64K" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "200K" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "256K" })).toBeInTheDocument();
  });

  it("uses the resolved provider row for auto dynamic providers without api keys", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));

    renderSettingsView({
      initialSection: "models",
      initialSettings: autoDynamicProviderPayload({
        configured: true,
        hasApiKey: false,
        apiBase: "https://proxy.example.test/v1",
        apiKeyHint: null,
      }),
    });

    const configurationButton = await screen.findByRole("button", {
      name: "Current configuration",
    });
    expect(configurationButton).toHaveTextContent("companyProxy/gpt-4o");
    expect(configurationButton).toHaveTextContent("Company Proxy");
    expect(configurationButton).not.toHaveTextContent("Not configured");
  });

  it("does not treat auto dynamic provider api keys as configured without apiBase", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));

    renderSettingsView({
      initialSection: "models",
      initialSettings: autoDynamicProviderPayload({
        configured: false,
        hasApiKey: true,
        apiBase: null,
        apiKeyHint: "sk-...",
      }),
    });

    const configurationButton = await screen.findByRole("button", {
      name: "Current configuration",
    });
    expect(configurationButton).toHaveTextContent("Not configured");
    expect(configurationButton.className).not.toMatch(/blue|sky|orange|amber|emerald|#2997ff/i);
    const unconfiguredIcon = within(configurationButton).getByTestId("provider-picker-unconfigured-icon");
    expect(unconfiguredIcon).toHaveClass("provider-picker-icon--unconfigured");
    expect(unconfiguredIcon.className).not.toMatch(/blue|sky|orange|amber|emerald|#2997ff/i);
    expect(configurationButton).toHaveTextContent("Company Proxy · companyProxy/gpt-4o");
  });

  it("marks the current model as unconfigured when its provider needs setup", async () => {
    const payload: SettingsPayload = {
      ...settingsPayload(),
      agent: {
        ...settingsPayload().agent,
        model: "openai-codex/gpt-5.1-codex",
        provider: "openai_codex",
        resolved_provider: "openai_codex",
        has_api_key: false,
      },
      model_presets: [
        {
          ...settingsPayload().model_presets[0],
          model: "openai-codex/gpt-5.1-codex",
          provider: "openai_codex",
        },
      ],
      providers: [
        {
          name: "openai_codex",
          label: "OpenAI Codex",
          configured: false,
          auth_type: "oauth",
          api_key_required: false,
          api_key_hint: null,
          api_base: null,
          default_api_base: null,
          oauth_account: null,
          oauth_expires_at: null,
          oauth_login_supported: true,
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/settings") return jsonResponse(payload);
        if (url === "/api/settings/cli-apps") {
          return jsonResponse({ apps: [], installed_count: 0 });
        }
        if (url === "/api/settings/mcp-presets") {
          return jsonResponse({ presets: [], installed_count: 0 });
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }),
    );

    renderSettingsView({ initialSection: "models" });

    const configurationButton = await screen.findByRole("button", {
      name: "Current configuration",
    });
    expect(configurationButton).toHaveTextContent("Not configured");
    expect(configurationButton).toHaveTextContent("OpenAI Codex · openai-codex/gpt-5.1-codex");
    expect(configurationButton.className).not.toMatch(/blue|sky|orange|amber|emerald|#2997ff/i);
    const oauthUnconfiguredIcon = within(configurationButton).getByTestId(
      "provider-picker-unconfigured-icon",
    );
    expect(oauthUnconfiguredIcon).toHaveClass("provider-picker-icon--unconfigured");
    expect(oauthUnconfiguredIcon.className).not.toMatch(/blue|sky|orange|amber|emerald|#2997ff/i);
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("keeps unsigned OAuth providers out of the active provider picker", async () => {
    const payload: SettingsPayload = {
      ...settingsPayload(),
      agent: {
        ...settingsPayload().agent,
        model: "deepseek-chat",
        provider: "deepseek",
        resolved_provider: "deepseek",
      },
      model_presets: [
        {
          ...settingsPayload().model_presets[0],
          model: "deepseek-chat",
          provider: "deepseek",
        },
      ],
      providers: [
        {
          name: "deepseek",
          label: "DeepSeek",
          configured: true,
          auth_type: "api_key",
          api_key_required: true,
          api_key_hint: "sk-...",
          api_base: "https://api.deepseek.com",
          default_api_base: "https://api.deepseek.com",
        },
        {
          name: "openai_codex",
          label: "OpenAI Codex",
          configured: false,
          auth_type: "oauth",
          api_key_required: false,
          api_key_hint: null,
          api_base: null,
          default_api_base: null,
          oauth_account: null,
          oauth_expires_at: null,
          oauth_login_supported: true,
        },
        {
          name: "github_copilot",
          label: "GitHub Copilot",
          configured: false,
          auth_type: "oauth",
          api_key_required: false,
          api_key_hint: null,
          api_base: null,
          default_api_base: "https://api.githubcopilot.com",
          oauth_account: null,
          oauth_expires_at: null,
          oauth_login_supported: true,
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/settings") return jsonResponse(payload);
        if (url === "/api/settings/cli-apps") {
          return jsonResponse({ apps: [], installed_count: 0 });
        }
        if (url === "/api/settings/mcp-presets") {
          return jsonResponse({ presets: [], installed_count: 0 });
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }),
    );

    renderSettingsView({ initialSection: "models" });

    const deepseekButtons = await screen.findAllByRole("button", { name: /DeepSeek/ });
    const providerPicker = deepseekButtons.find(
      (button) => button.getAttribute("aria-haspopup") === "menu",
    );
    if (!providerPicker) throw new Error("provider picker was not found");
    fireEvent.pointerDown(providerPicker);

    expect(await screen.findByRole("menuitem", { name: /DeepSeek/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /OpenAI Codex/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /GitHub Copilot/ })).not.toBeInTheDocument();
  });

  it("does not fetch model lists for unsigned OAuth providers", async () => {
    const payload: SettingsPayload = {
      ...settingsPayload(),
      agent: {
        ...settingsPayload().agent,
        model: "",
        provider: "openai_codex",
        resolved_provider: "openai_codex",
      },
      model_presets: [
        {
          ...settingsPayload().model_presets[0],
          model: "",
          provider: "openai_codex",
        },
      ],
      providers: [
        {
          name: "openai_codex",
          label: "OpenAI Codex",
          configured: false,
          auth_type: "oauth",
          api_key_required: false,
          api_key_hint: null,
          api_base: null,
          default_api_base: null,
          oauth_account: null,
          oauth_expires_at: null,
          oauth_login_supported: true,
        },
        {
          name: "github_copilot",
          label: "GitHub Copilot",
          configured: false,
          auth_type: "oauth",
          api_key_required: false,
          api_key_hint: null,
          api_base: null,
          default_api_base: "https://api.githubcopilot.com",
          oauth_account: null,
          oauth_expires_at: null,
          oauth_login_supported: true,
        },
      ],
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/settings") return jsonResponse(payload);
      if (url === "/api/settings/cli-apps") {
        return jsonResponse({ apps: [], installed_count: 0 });
      }
      if (url === "/api/settings/mcp-presets") {
        return jsonResponse({ presets: [], installed_count: 0 });
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettingsView({ initialSection: "models" });

    fireEvent.pointerDown(await screen.findByRole("button", { name: /Select model/i }));
    expect(
      await screen.findByText("Configure this provider before loading models."),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("/api/settings/provider-models"),
      ),
    ).toBe(false);
  });

  it("prefills manual model ids for configured OAuth providers", async () => {
    const payload: SettingsPayload = {
      ...settingsPayload(),
      agent: {
        ...settingsPayload().agent,
        model: "open-codex/gpt-5.5",
        provider: "openai_codex",
        resolved_provider: "openai_codex",
      },
      model_presets: [
        {
          ...settingsPayload().model_presets[0],
          model: "open-codex/gpt-5.5",
          provider: "openai_codex",
        },
      ],
      providers: [
        {
          name: "openai_codex",
          label: "OpenAI Codex",
          configured: true,
          auth_type: "oauth",
          api_key_required: false,
          api_key_hint: null,
          api_base: null,
          default_api_base: null,
          oauth_account: "acct-test",
          oauth_expires_at: null,
          oauth_login_supported: true,
        },
      ],
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/settings") return jsonResponse(payload);
      if (url === "/api/settings/cli-apps") {
        return jsonResponse({ apps: [], installed_count: 0 });
      }
      if (url === "/api/settings/mcp-presets") {
        return jsonResponse({ presets: [], installed_count: 0 });
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettingsView({ initialSection: "models" });

    const modelButtons = await screen.findAllByRole("button", { name: /open-codex\/gpt-5\.5/i });
    fireEvent.pointerDown(modelButtons[modelButtons.length - 1]);
    const input = (await screen.findByPlaceholderText("Search or type model ID")) as HTMLInputElement;
    expect(input.value).toBe("open-codex/gpt-5.5");

    fireEvent.change(input, { target: { value: "openai-codex/gpt-5.5" } });
    expect(await screen.findByText("“openai-codex/gpt-5.5”")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).startsWith("/api/settings/provider-models"),
      ),
    ).toBe(false);
  });

  it("can close the new configuration dialog without trapping the settings page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/settings") return jsonResponse(settingsPayload());
        if (url === "/api/settings/cli-apps") {
          return jsonResponse({ apps: [], installed_count: 0 });
        }
        if (url === "/api/settings/mcp-presets") {
          return jsonResponse({ presets: [], installed_count: 0 });
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }),
    );

    renderSettingsView({ initialSection: "models" });

    const configurationButton = await screen.findByRole("button", { name: "Current configuration" });
    fireEvent.pointerDown(configurationButton!);
    fireEvent.click(await screen.findByText("Add configuration"));

    expect(await screen.findByRole("heading", { name: "New model configuration" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "New model configuration" })).not.toBeInTheDocument(),
    );
    expect(document.body.style.pointerEvents).not.toBe("none");

    fireEvent.pointerDown(configurationButton!);
    expect(await screen.findByText("Add configuration")).toBeInTheDocument();
  });

  it("loads provider models and lets users choose one without typing the id manually", async () => {
    const payload: SettingsPayload = {
      ...settingsPayload(),
      agent: {
        ...settingsPayload().agent,
        model: "deepseek-chat",
        provider: "deepseek",
        resolved_provider: "deepseek",
      },
      model_presets: [
        {
          ...settingsPayload().model_presets[0],
          model: "deepseek-chat",
          provider: "deepseek",
        },
      ],
      providers: [
        {
          name: "deepseek",
          label: "DeepSeek",
          configured: true,
          auth_type: "api_key",
          api_key_required: true,
          api_key_hint: "sk-...",
          api_base: "https://api.deepseek.com",
          default_api_base: "https://api.deepseek.com",
        },
      ],
    };
    const updatedPayload: SettingsPayload = {
      ...payload,
      agent: {
        ...payload.agent,
        model: "deepseek-reasoner",
      },
      model_presets: [
        {
          ...payload.model_presets[0],
          model: "deepseek-reasoner",
        },
      ],
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/settings") return jsonResponse(payload);
      if (url === "/api/settings/cli-apps") {
        return jsonResponse({ apps: [], installed_count: 0 });
      }
      if (url === "/api/settings/mcp-presets") {
        return jsonResponse({ presets: [], installed_count: 0 });
      }
      if (url === "/api/settings/provider-models?provider=deepseek") {
        return jsonResponse({
          provider: "deepseek",
          label: "DeepSeek",
          status: "available",
          catalog_kind: "official",
          models: [
            { id: "deepseek-chat", owned_by: "deepseek", context_window: 65536 },
            { id: "deepseek-reasoner", owned_by: "deepseek", context_window: 65536 },
          ],
          model_count: 2,
          fetched_at: 1,
        });
      }
      if (url === "/api/settings/update?model_preset=default&model=deepseek-reasoner") {
        return jsonResponse(updatedPayload);
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettingsView({ initialSection: "models" });

    const modelButtons = await screen.findAllByRole("button", { name: /deepseek-chat/i });
    fireEvent.pointerDown(modelButtons[modelButtons.length - 1]);
    await screen.findByText("deepseek-reasoner");
    fireEvent.click(screen.getAllByText("deepseek-reasoner")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/settings/provider-models?provider=deepseek",
        expect.objectContaining({
          headers: { Authorization: "Bearer tok" },
        }),
      ),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/settings/update?model_preset=default&model=deepseek-reasoner",
        expect.objectContaining({
          headers: { Authorization: "Bearer tok" },
        }),
      ),
    );
  });

  it("saves network safety without exposing technical SSRF copy", async () => {
    const payload = settingsPayload();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/settings") return jsonResponse(payload);
      if (url === "/api/settings/cli-apps") {
        return jsonResponse({ apps: [], installed_count: 0 });
      }
      if (url === "/api/settings/mcp-presets") {
        return jsonResponse({ presets: [], installed_count: 0 });
      }
      if (url === "/api/settings/network-safety/update?webui_allow_local_service_access=false&webui_default_access_mode=default") {
        return jsonResponse({
          ...payload,
          advanced: { ...payload.advanced, webui_allow_local_service_access: false },
          requires_restart: true,
          restart_required_sections: ["runtime"],
        });
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettingsView({ initialSection: "advanced" });

    expect(await screen.findByText("Web safety")).toBeInTheDocument();
    expect(screen.queryByText(/SSRF/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Private Service Protection")).not.toBeInTheDocument();
    expect(screen.getByText("Default access")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restricted" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Default Permission" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Full Access" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Local services" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/settings/network-safety/update?webui_allow_local_service_access=false&webui_default_access_mode=default",
        expect.objectContaining({
          headers: { Authorization: "Bearer tok" },
        }),
      ),
    );
  });

  it("saves optional-key web search providers without an API key", async () => {
    const payload = {
      ...settingsPayload(),
      web_search: {
        ...settingsPayload().web_search,
        provider: "duckduckgo",
        providers: [
          { name: "duckduckgo", label: "DuckDuckGo", credential: "none" as const },
          { name: "keenable", label: "Keenable", credential: "optional_api_key" as const },
        ],
      },
    };
    const updatedPayload = {
      ...payload,
      web_search: {
        ...payload.web_search,
        provider: "keenable",
      },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/settings") return jsonResponse(payload);
      if (url === "/api/settings/cli-apps") return jsonResponse({ apps: [], installed_count: 0 });
      if (url === "/api/settings/mcp-presets") return jsonResponse({ presets: [], installed_count: 0 });
      if (
        url ===
        "/api/settings/web-search/update?provider=keenable&max_results=5&timeout=30&use_jina_reader=true"
      ) {
        return jsonResponse(updatedPayload);
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettingsView({ initialSection: "browser" });

    fireEvent.pointerDown(await screen.findByRole("button", { name: /DuckDuckGo/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Keenable" }));
    const saveButton = screen
      .getAllByRole("button", { name: "Save" })
      .find((button) => !(button as HTMLButtonElement).disabled);
    if (!saveButton) throw new Error("enabled Save button was not found");
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/settings/web-search/update?provider=keenable&max_results=5&timeout=30&use_jina_reader=true",
        expect.objectContaining({
          headers: { Authorization: "Bearer tok" },
        }),
      ),
    );
  });

  it("uses native host safety copy on the native surface", async () => {
    const payload = {
      ...settingsPayload(),
      surface: "native" as const,
      runtime_surface: "native" as const,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/settings") return jsonResponse(payload);
        if (url === "/api/settings/cli-apps") return jsonResponse({ apps: [], installed_count: 0 });
        if (url === "/api/settings/mcp-presets") return jsonResponse({ presets: [], installed_count: 0 });
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }),
    );

    renderSettingsView({ initialSection: "advanced" });

    expect(await screen.findByText("App safety")).toBeInTheDocument();
    expect(screen.queryByText("Web safety")).not.toBeInTheDocument();
    expect(screen.getByText("Allow Full Access shell commands to reach services on this Mac.")).toBeInTheDocument();
  });

  it("refreshes settings with a fresh token after native engine restart", async () => {
    const payload = {
      ...settingsPayload(),
      surface: "native" as const,
      runtime_surface: "native" as const,
      runtime_capabilities: {
        can_restart_engine: true,
        can_pick_folder: true,
        can_open_logs: true,
        can_export_diagnostics: true,
      },
    };
    const restartedPayload = {
      ...payload,
      advanced: { ...payload.advanced, webui_allow_local_service_access: false },
      requires_restart: true,
      restart_required_sections: ["runtime"],
    };
    const refreshedPayload = {
      ...restartedPayload,
      requires_restart: false,
      restart_required_sections: [],
    };
    const restartEngine = vi.fn(async () => "fresh-token");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
      if (url === "/api/settings" && auth === "Bearer fresh-token") {
        return jsonResponse(refreshedPayload);
      }
      if (url === "/api/settings") return jsonResponse(payload);
      if (url === "/api/settings/cli-apps") return jsonResponse({ apps: [], installed_count: 0 });
      if (url === "/api/settings/mcp-presets") return jsonResponse({ presets: [], installed_count: 0 });
      if (url === "/api/settings/network-safety/update?webui_allow_local_service_access=false&webui_default_access_mode=default") {
        return jsonResponse(restartedPayload);
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSettingsView({
      initialSection: "advanced",
      onNativeEngineRestart: restartEngine,
    });

    expect(await screen.findByText("App safety")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Local services" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(restartEngine).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/settings",
        expect.objectContaining({
          headers: { Authorization: "Bearer fresh-token" },
        }),
      ),
    );
  });
});

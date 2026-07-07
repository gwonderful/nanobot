import type { ChatSummary, SidebarStatePayload, WorkspaceScopePayload } from "@/lib/types";
import { normalizeWorkspacePath, projectNameFromPath, sameWorkspacePath } from "@/lib/workspace";

export function addExplicitProject(
  state: SidebarStatePayload,
  scope: WorkspaceScopePayload,
): SidebarStatePayload {
  const entry = projectEntryFromScope(scope);
  return {
    ...state,
    removed_project_keys: removeProjectKey(state.removed_project_keys, entry.key),
    explicit_projects: {
      ...state.explicit_projects,
      [entry.key]: entry.value,
    },
  };
}

export function toggleProjectPin(
  state: SidebarStatePayload,
  projectKey: string,
): SidebarStatePayload {
  const key = normalizeWorkspacePath(projectKey);
  const pinned = new Set(state.pinned_project_keys.map(normalizeWorkspacePath));
  if (pinned.has(key)) {
    pinned.delete(key);
  } else {
    pinned.add(key);
  }
  return {
    ...state,
    pinned_project_keys: Array.from(pinned),
  };
}

export function archiveProject(
  state: SidebarStatePayload,
  options: {
    projectKey: string;
    sessions: ChatSummary[];
    defaultWorkspacePath?: string | null;
  },
): SidebarStatePayload {
  const projectKey = normalizeWorkspacePath(options.projectKey);
  const archived = new Set(state.archived_keys);
  const newlyArchived: string[] = [];
  const projectSessions = options.sessions.filter(
    (session) => sessionProjectKey(session, options.defaultWorkspacePath) === projectKey,
  );

  for (const session of projectSessions) {
    if (archived.has(session.key)) continue;
    archived.add(session.key);
    newlyArchived.push(session.key);
  }

  const pinnedToArchive = new Set(newlyArchived);
  const firstProjectSession = projectSessions[0];
  const nextState: SidebarStatePayload = {
    ...state,
    pinned_keys: state.pinned_keys.filter((key) => !pinnedToArchive.has(key)),
    archived_keys: [...state.archived_keys, ...newlyArchived],
  };
  if (!firstProjectSession?.workspaceScope) return nextState;
  return addExplicitProject(nextState, firstProjectSession.workspaceScope);
}

export function removeProject(
  state: SidebarStatePayload,
  projectKey: string,
): SidebarStatePayload {
  const key = normalizeWorkspacePath(projectKey);
  return {
    ...state,
    pinned_project_keys: removeProjectKey(state.pinned_project_keys, key),
    removed_project_keys: addProjectKey(state.removed_project_keys, key),
  };
}

export function unarchiveChat(
  state: SidebarStatePayload,
  session: ChatSummary,
  defaultWorkspacePath?: string | null,
): SidebarStatePayload {
  const nextState: SidebarStatePayload = {
    ...state,
    archived_keys: state.archived_keys.filter((key) => key !== session.key),
  };
  const projectKey = sessionProjectKey(session, defaultWorkspacePath);
  if (!projectKey || !session.workspaceScope) return nextState;
  return addExplicitProject(
    {
      ...nextState,
      removed_project_keys: removeProjectKey(nextState.removed_project_keys, projectKey),
    },
    session.workspaceScope,
  );
}

function projectEntryFromScope(scope: WorkspaceScopePayload): {
  key: string;
  value: SidebarStatePayload["explicit_projects"][string];
} {
  const key = normalizeWorkspacePath(scope.project_path.trim());
  const name = scope.project_name?.trim() || projectNameFromPath(key);
  return {
    key,
    value: {
      path: key,
      name,
      created_at: null,
      updated_at: null,
    },
  };
}

function sessionProjectKey(
  session: ChatSummary,
  defaultWorkspacePath?: string | null,
): string | null {
  const path = session.workspaceScope?.project_path;
  if (!path || sameWorkspacePath(path, defaultWorkspacePath)) return null;
  return normalizeWorkspacePath(path);
}

function addProjectKey(keys: string[], key: string): string[] {
  const normalized = normalizeWorkspacePath(key);
  const out = keys.map(normalizeWorkspacePath);
  return out.includes(normalized) ? out : [...out, normalized];
}

function removeProjectKey(keys: string[], key: string): string[] {
  const normalized = normalizeWorkspacePath(key);
  return keys.map(normalizeWorkspacePath).filter((item) => item !== normalized);
}

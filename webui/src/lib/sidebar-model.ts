import { deriveTitle } from "@/lib/format";
import type { ChatSummary, SidebarSortMode, SidebarStatePayload } from "@/lib/types";
import {
  normalizeWorkspacePath,
  projectNameFromPath,
  sameWorkspacePath,
  shortWorkspacePath,
} from "@/lib/workspace";

const CONVERSATIONS_ARCHIVE_GROUP_KEY = "conversations";
const CONVERSATIONS_ARCHIVE_GROUP_LABEL = "Chats";

export interface SidebarProjectGroup {
  key: string;
  path: string;
  label: string;
  sessions: ChatSummary[];
  archivedSessions: ChatSummary[];
  isPinned: boolean;
  isExplicit: boolean;
  isRemoved: boolean;
  updatedAt: number;
}

export interface SidebarProjectOption {
  key: string;
  path: string;
  label: string;
  shortPath?: string;
  hasUnarchivedSessions: boolean;
  hasArchivedSessions: boolean;
  isExplicit: boolean;
  isRemoved: boolean;
}

export interface ArchivedConversationGroup {
  key: string;
  label: string;
  projectPath: string | null;
  sessions: ChatSummary[];
}

export interface SidebarModel {
  pinnedProjects: SidebarProjectGroup[];
  pinnedChats: ChatSummary[];
  workspaceProjects: SidebarProjectGroup[];
  conversations: ChatSummary[];
  projectOptions: SidebarProjectOption[];
  archivedGroups: ArchivedConversationGroup[];
  archivedCount: number;
}

interface ProjectBucket {
  key: string;
  path: string;
  label: string;
  sessions: ChatSummary[];
  archivedSessions: ChatSummary[];
  isExplicit: boolean;
  updatedAt: number;
  archivedUpdatedAt: number;
}

export function buildSidebarModel(input: {
  sessions: ChatSummary[];
  sidebarState: SidebarStatePayload;
  defaultWorkspacePath?: string | null;
}): SidebarModel {
  const { sessions, sidebarState, defaultWorkspacePath } = input;
  const archivedKeys = new Set(sidebarState.archived_keys);
  const pinnedKeys = new Set(sidebarState.pinned_keys);
  const pinnedProjectKeys = normalizedKeySet(sidebarState.pinned_project_keys);
  const removedProjectKeys = normalizedKeySet(sidebarState.removed_project_keys);
  const projects = new Map<string, ProjectBucket>();
  const pureConversations: ChatSummary[] = [];
  const pureArchivedConversations: ChatSummary[] = [];

  for (const session of sessions) {
    const projectPath = sessionProjectPath(session, defaultWorkspacePath);
    const isArchived = archivedKeys.has(session.key);
    if (!projectPath) {
      if (isArchived) {
        pureArchivedConversations.push(session);
      } else {
        pureConversations.push(session);
      }
      continue;
    }

    const bucket = ensureProject(projects, sidebarState, projectPath, session.workspaceScope?.project_name);
    if (isArchived) {
      bucket.archivedSessions.push(session);
      bucket.archivedUpdatedAt = Math.max(bucket.archivedUpdatedAt, sessionTime(session, "updatedAt"));
    } else {
      bucket.sessions.push(session);
      bucket.updatedAt = Math.max(bucket.updatedAt, sessionTime(session, "updatedAt"));
    }
  }

  for (const [rawKey, entry] of Object.entries(sidebarState.explicit_projects)) {
    const path = entry.path || rawKey;
    const bucket = ensureProject(projects, sidebarState, path, entry.name ?? undefined);
    bucket.isExplicit = true;
    const override = sidebarState.project_name_overrides[bucket.key]?.trim();
    if (override) {
      bucket.label = override;
    } else if (entry.name?.trim()) {
      bucket.label = entry.name.trim();
    }
  }

  const pinnedChats = sortSessions(
    sessions.filter((session) => {
      if (archivedKeys.has(session.key) || !pinnedKeys.has(session.key)) return false;
      const projectPath = sessionProjectPath(session, defaultWorkspacePath);
      if (!projectPath) return true;
      const projectKey = normalizeWorkspacePath(projectPath);
      return !pinnedProjectKeys.has(projectKey) && !removedProjectKeys.has(projectKey);
    }),
    sidebarState.view.sort,
    sidebarState.title_overrides,
  );

  const conversations = sortSessions(
    pureConversations.filter((session) => !pinnedKeys.has(session.key)),
    sidebarState.view.sort,
    sidebarState.title_overrides,
  );

  const pinnedProjects: SidebarProjectGroup[] = [];
  const workspaceProjects: SidebarProjectGroup[] = [];
  let archivedCount = pureArchivedConversations.length;

  for (const bucket of projects.values()) {
    const isPinned = pinnedProjectKeys.has(bucket.key);
    const isRemoved = removedProjectKeys.has(bucket.key);
    archivedCount += bucket.archivedSessions.length;
    if (isRemoved) continue;

    if (isPinned) {
      if (bucket.sessions.length || bucket.archivedSessions.length || bucket.isExplicit) {
        pinnedProjects.push(toProjectGroup(bucket, {
          isPinned,
          isRemoved,
          sessions: bucket.sessions,
          sort: sidebarState.view.sort,
          titleOverrides: sidebarState.title_overrides,
        }));
      }
      continue;
    }

    const visibleSessions = bucket.sessions.filter((session) => !pinnedKeys.has(session.key));
    if (visibleSessions.length || bucket.isExplicit) {
      workspaceProjects.push(toProjectGroup(bucket, {
        isPinned,
        isRemoved,
        sessions: visibleSessions,
        sort: sidebarState.view.sort,
        titleOverrides: sidebarState.title_overrides,
      }));
    }
  }

  return {
    pinnedProjects: sortProjects(pinnedProjects),
    pinnedChats,
    workspaceProjects: sortProjects(workspaceProjects),
    conversations,
    projectOptions: buildProjectOptions(projects, pinnedProjectKeys, removedProjectKeys),
    archivedGroups: buildArchivedGroups(
      projects,
      pureArchivedConversations,
      sidebarState.view.sort,
      sidebarState.title_overrides,
    ),
    archivedCount,
  };
}

function sessionProjectPath(
  session: ChatSummary,
  defaultWorkspacePath: string | null | undefined,
): string | null {
  const path = session.workspaceScope?.project_path;
  if (!path || sameWorkspacePath(path, defaultWorkspacePath)) return null;
  return path;
}

function ensureProject(
  projects: Map<string, ProjectBucket>,
  sidebarState: SidebarStatePayload,
  path: string,
  name: string | null | undefined,
): ProjectBucket {
  const key = normalizeWorkspacePath(path);
  const override = sidebarState.project_name_overrides[key]?.trim();
  const label = override || name?.trim() || projectNameFromPath(path);
  const existing = projects.get(key);
  if (existing) {
    if (override || name?.trim()) existing.label = label;
    return existing;
  }
  const bucket: ProjectBucket = {
    key,
    path,
    label,
    sessions: [],
    archivedSessions: [],
    isExplicit: false,
    updatedAt: 0,
    archivedUpdatedAt: 0,
  };
  projects.set(key, bucket);
  return bucket;
}

function toProjectGroup(
  bucket: ProjectBucket,
  options: {
    isPinned: boolean;
    isRemoved: boolean;
    sessions: ChatSummary[];
    sort: SidebarSortMode;
    titleOverrides: Record<string, string>;
  },
): SidebarProjectGroup {
  return {
    key: bucket.key,
    path: bucket.path,
    label: bucket.label,
    sessions: sortSessions(options.sessions, options.sort, options.titleOverrides),
    archivedSessions: sortSessions(bucket.archivedSessions, options.sort, options.titleOverrides),
    isPinned: options.isPinned,
    isExplicit: bucket.isExplicit,
    isRemoved: options.isRemoved,
    updatedAt: Math.max(bucket.updatedAt, bucket.archivedUpdatedAt),
  };
}

function buildProjectOptions(
  projects: Map<string, ProjectBucket>,
  pinnedProjectKeys: Set<string>,
  removedProjectKeys: Set<string>,
): SidebarProjectOption[] {
  return Array.from(projects.values())
    .map((bucket) => ({
      key: bucket.key,
      path: bucket.path,
      label: bucket.label,
      shortPath: shortWorkspacePath(bucket.path),
      hasUnarchivedSessions: bucket.sessions.length > 0,
      hasArchivedSessions: bucket.archivedSessions.length > 0,
      isExplicit: bucket.isExplicit,
      isRemoved: removedProjectKeys.has(bucket.key),
      isPinned: pinnedProjectKeys.has(bucket.key),
    }))
    .sort(compareByLabel);
}

function buildArchivedGroups(
  projects: Map<string, ProjectBucket>,
  pureArchivedConversations: ChatSummary[],
  sort: SidebarSortMode,
  titleOverrides: Record<string, string>,
): ArchivedConversationGroup[] {
  const groups: ArchivedConversationGroup[] = Array.from(projects.values())
    .filter((bucket) => bucket.archivedSessions.length > 0)
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      projectPath: bucket.path,
      sessions: sortSessions(bucket.archivedSessions, sort, titleOverrides),
    }))
    .sort(compareByLabel);

  if (pureArchivedConversations.length) {
    groups.push({
      key: CONVERSATIONS_ARCHIVE_GROUP_KEY,
      label: CONVERSATIONS_ARCHIVE_GROUP_LABEL,
      projectPath: null,
      sessions: sortSessions(pureArchivedConversations, sort, titleOverrides),
    });
  }
  return groups;
}

function sortProjects(projects: SidebarProjectGroup[]): SidebarProjectGroup[] {
  return [...projects].sort((a, b) => {
    const timeOrder = b.updatedAt - a.updatedAt;
    if (timeOrder !== 0) return timeOrder;
    return compareByLabel(a, b);
  });
}

function sortSessions(
  sessions: ChatSummary[],
  sort: SidebarSortMode,
  titleOverrides: Record<string, string>,
): ChatSummary[] {
  return [...sessions].sort((a, b) => {
    if (sort === "title_asc") {
      const titleOrder = titleForSort(a, titleOverrides).localeCompare(
        titleForSort(b, titleOverrides),
        "en",
        { numeric: true, sensitivity: "base" },
      );
      if (titleOrder !== 0) return titleOrder;
      return sessionTime(b, "updatedAt") - sessionTime(a, "updatedAt");
    }
    const field = sort === "created_desc" ? "createdAt" : "updatedAt";
    return sessionTime(b, field) - sessionTime(a, field);
  });
}

function titleForSort(
  session: ChatSummary,
  titleOverrides: Record<string, string>,
): string {
  return (
    titleOverrides[session.key]?.trim()
    || session.title?.trim()
    || deriveTitle(session.preview, "new chat")
  ).toLocaleLowerCase("en");
}

function sessionTime(session: ChatSummary, field: "createdAt" | "updatedAt"): number {
  const ts = Date.parse(session[field] ?? "");
  return Number.isFinite(ts) ? ts : 0;
}

function normalizedKeySet(keys: string[]): Set<string> {
  return new Set(keys.map((key) => normalizeWorkspacePath(key)));
}

function compareByLabel<T extends { label: string }>(a: T, b: T): number {
  return a.label.localeCompare(b.label, "en", {
    numeric: true,
    sensitivity: "base",
  });
}

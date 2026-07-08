import {
  memo,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  Folder,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deriveTitle, relativeTime } from "@/lib/format";
import {
  COLLAPSED_CHATS_VISIBLE_COUNT,
  displayTitle,
  groupSessions,
  isCollapsedProject,
  isFoldableChatsGroup,
  isFoldedChatsGroup,
  limitGroups,
  visibleSessionsForGroup,
  type ChatGroupLabels,
} from "@/lib/chat-groups";
import type { SidebarModel, SidebarProjectGroup } from "@/lib/sidebar-model";
import { cn } from "@/lib/utils";
import type { ChatSummary, SidebarDensity, SidebarSortMode } from "@/lib/types";

const INITIAL_VISIBLE_SESSIONS = 160;
const VISIBLE_SESSIONS_INCREMENT = 160;
const ACTION_MENU_CONTENT_CLASS = "w-[8.5rem] min-w-[8.5rem]";
const ACTION_MENU_ITEM_CLASS = "grid w-[7.75rem] grid-cols-[1rem_minmax(0,1fr)] items-center gap-2";
const PINNED_SECTION_GROUP_ID = "section:pinned";
const WORKSPACE_SECTION_GROUP_ID = "section:workspace";
const CHATS_SECTION_GROUP_ID = "section:chats";

interface ChatListProps {
  sessions: ChatSummary[];
  sidebarModel?: SidebarModel;
  activeKey: string | null;
  onNewChat?: () => void;
  onAddProjectRequest?: () => void;
  onSelect: (key: string) => void;
  onRequestDelete: (key: string, label: string) => void;
  onTogglePin: (key: string) => void;
  onRequestRename: (key: string, label: string) => void;
  onToggleArchive: (key: string) => void;
  onToggleGroup?: (groupId: string) => void;
  onRequestRenameProject?: (projectKey: string, label: string) => void;
  onNewChatInProject?: (projectPath: string, projectName: string) => void;
  onToggleProjectPin?: (projectKey: string) => void;
  onArchiveProject?: (projectKey: string) => void;
  onRemoveProject?: (projectKey: string) => void;
  pinnedKeys?: string[];
  archivedKeys?: string[];
  titleOverrides?: Record<string, string>;
  projectNameOverrides?: Record<string, string>;
  collapsedGroups?: Record<string, boolean>;
  runningChatIds?: string[];
  updatedChatIds?: string[];
  density?: SidebarDensity;
  showPreviews?: boolean;
  showTimestamps?: boolean;
  sort?: SidebarSortMode;
  showArchived?: boolean;
  defaultWorkspacePath?: string | null;
  actionMenuPortalContainer?: HTMLElement | null;
  loading?: boolean;
  emptyLabel?: string;
}

export const ChatList = memo(function ChatList({
  sessions,
  sidebarModel,
  activeKey,
  onNewChat,
  onAddProjectRequest,
  onSelect,
  onRequestDelete,
  onTogglePin,
  onRequestRename,
  onToggleArchive,
  onToggleGroup,
  onRequestRenameProject,
  onNewChatInProject,
  onToggleProjectPin,
  onArchiveProject,
  onRemoveProject,
  pinnedKeys = [],
  archivedKeys = [],
  titleOverrides = {},
  projectNameOverrides = {},
  collapsedGroups = {},
  runningChatIds = [],
  updatedChatIds = [],
  density = "comfortable",
  showPreviews = false,
  showTimestamps = false,
  sort = "updated_desc",
  showArchived = false,
  defaultWorkspacePath,
  actionMenuPortalContainer,
  loading,
  emptyLabel,
}: ChatListProps) {
  const { t } = useTranslation();
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_SESSIONS);
  const labels = useMemo<ChatGroupLabels>(() => ({
    pinned: t("chat.groups.pinned"),
    all: t("chat.groups.all"),
    today: t("chat.groups.today"),
    yesterday: t("chat.groups.yesterday"),
    earlier: t("chat.groups.earlier"),
    archived: t("chat.groups.archived"),
    projects: t("chat.groups.projects"),
    fallbackTitle: t("chat.newChat"),
  }), [t]);
  const groups = useMemo(
    () => groupSessions(sessions, labels, {
      pinnedKeys,
      archivedKeys,
      titleOverrides,
      projectNameOverrides,
      showArchived,
      sort,
      defaultWorkspacePath,
    }),
    [
      archivedKeys,
      labels,
      pinnedKeys,
      sessions,
      showArchived,
      sort,
      titleOverrides,
      projectNameOverrides,
      defaultWorkspacePath,
    ],
  );
  const limitedGroups = useMemo(
    () => limitGroups(groups, visibleLimit, activeKey, collapsedGroups),
    [activeKey, collapsedGroups, groups, visibleLimit],
  );
  const totalSessionCount = useMemo(
    () => groups.reduce(
      (total, group) =>
        total + (isCollapsedProject(group, collapsedGroups) ? 0 : group.sessions.length),
      0,
    ),
    [collapsedGroups, groups],
  );
  const visibleSessionCount = useMemo(
    () => limitedGroups.reduce((total, group) => total + group.sessions.length, 0),
    [limitedGroups],
  );
  const hiddenSessionCount = Math.max(0, totalSessionCount - visibleSessionCount);

  useEffect(() => {
    setVisibleLimit(INITIAL_VISIBLE_SESSIONS);
  }, [showArchived, sort]);

  if (sidebarModel) {
    return (
      <SidebarModelContent
        model={sidebarModel}
        activeKey={activeKey}
        onNewChat={onNewChat}
        onAddProjectRequest={onAddProjectRequest}
        onSelect={onSelect}
        onRequestDelete={onRequestDelete}
        onTogglePin={onTogglePin}
        onRequestRename={onRequestRename}
        onToggleArchive={onToggleArchive}
        onToggleGroup={onToggleGroup}
        onRequestRenameProject={onRequestRenameProject}
        onNewChatInProject={onNewChatInProject}
        onToggleProjectPin={onToggleProjectPin}
        onArchiveProject={onArchiveProject}
        onRemoveProject={onRemoveProject}
        pinnedKeys={pinnedKeys}
        archivedKeys={archivedKeys}
        titleOverrides={titleOverrides}
        collapsedGroups={collapsedGroups}
        runningChatIds={runningChatIds}
        updatedChatIds={updatedChatIds}
        compact={density === "compact"}
        showPreviews={showPreviews}
        showTimestamps={showTimestamps}
        actionMenuPortalContainer={actionMenuPortalContainer}
        emptyLabel={emptyLabel}
        loading={loading}
      />
    );
  }

  if (loading && sessions.length === 0) {
    return (
      <div className="px-3 py-6 text-[12px] text-muted-foreground">
        {t("chat.loading")}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="px-3 py-6 text-[12px] leading-5 text-muted-foreground/80">
        {emptyLabel ?? t("chat.noSessions")}
      </div>
    );
  }

  const pinned = new Set(pinnedKeys);
  const archived = new Set(archivedKeys);
  const running = new Set(runningChatIds);
  const updated = new Set(updatedChatIds);
  const compact = density === "compact";
  const firstProjectGroupIndex = limitedGroups.findIndex((group) => group.kind === "project");

  return (
    <div className="h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent">
      <div className="min-w-0 space-y-3 px-2 py-1.5">
        {limitedGroups.map((group, index) => {
          const foldableChatsGroup = isFoldableChatsGroup(group);
          const foldedChatsGroup = isFoldedChatsGroup(group, collapsedGroups);
          const visibleSessions = visibleSessionsForGroup(
            group,
            activeKey,
            collapsedGroups,
          );
          const hiddenInGroup = Math.max(0, group.sessions.length - visibleSessions.length);
          const canToggleFold = group.sessions.length > COLLAPSED_CHATS_VISIBLE_COUNT;

          return (
            <section key={group.id} aria-label={group.label}>
              {index === firstProjectGroupIndex ? (
                <div className="px-2 pb-1 text-[12px] font-medium text-muted-foreground/65">
                  {labels.projects}
                </div>
              ) : null}
              {group.kind === "project" ? (
                <ProjectGroupHeader
                  label={group.label}
                  path={group.projectPath}
                  collapsed={Boolean(collapsedGroups[group.id])}
                  onToggle={() => onToggleGroup?.(group.id)}
                  onRequestRename={
                    group.projectKey && onRequestRenameProject
                      ? () => onRequestRenameProject(group.projectKey ?? "", group.label)
                      : undefined
                  }
                  onNewChat={
                    group.projectPath && onNewChatInProject
                      ? () => onNewChatInProject(group.projectPath ?? "", group.label)
                      : undefined
                  }
                  actionMenuPortalContainer={actionMenuPortalContainer}
                  updatedAt={showTimestamps ? group.updatedAt : null}
                />
              ) : (
                <ChatsGroupHeader label={group.label} />
              )}
              {group.kind === "project" && collapsedGroups[group.id] ? null : (
                <ul className="space-y-0.5">
                  {visibleSessions.map((s) => {
                    const active = s.key === activeKey;
                    const fallbackTitle = t("chat.fallbackTitle", {
                      id: s.chatId.slice(0, 6),
                    });
                    const generatedTitle = s.title?.trim() || "";
                    const title = displayTitle(s, titleOverrides, t("chat.newChat"));
                    const tooltipTitle =
                      titleOverrides[s.key]?.trim() ||
                      generatedTitle ||
                      deriveTitle(s.preview, fallbackTitle);
                    const isPinned = pinned.has(s.key);
                    const isArchived = archived.has(s.key);
                    const preview = s.preview.trim();
                    const showPreview = showPreviews && preview && preview !== title;
                    const timestamp = showTimestamps
                      ? relativeTime(s.updatedAt ?? s.createdAt)
                      : "";
                    const projectMode = group.kind === "project";
                    const actionsLabel = t("chat.actions", { title });
                    const activityState = running.has(s.chatId)
                      ? "running"
                      : updated.has(s.chatId) && !active
                        ? "updated"
                        : null;
                    return (
                      <li key={s.key} className="min-w-0">
                        <div
                          className={cn(
                            "sidebar-chat-row group flex min-w-0 max-w-full items-center gap-2 rounded-xl px-2 text-[13px] transition-[background-color,border-color,box-shadow,color]",
                            compact ? "min-h-7" : "min-h-8",
                            projectMode && "sidebar-chat-row--project",
                            active
                              ? "sidebar-chat-row--active text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/82 hover:text-sidebar-foreground",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSelect(s.key)}
                            title={tooltipTitle}
                            className={cn(
                              "min-w-0 flex-1 overflow-hidden text-left",
                              compact ? "py-1" : "py-1.5",
                              projectMode && "pl-7",
                            )}
                          >
                            {projectMode ? (
                              <span className="flex w-full min-w-0 items-baseline gap-2">
                                <span className="min-w-0 flex-1 truncate font-medium leading-5">
                                  {title}
                                </span>
                                {timestamp ? (
                                  <span className="shrink-0 text-[11.5px] font-medium text-muted-foreground/58">
                                    {timestamp}
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="block w-full truncate font-medium leading-5">
                                {title}
                              </span>
                            )}
                            {showPreview ? (
                              <span className="block w-full truncate text-[11.5px] leading-4 text-muted-foreground/72">
                                {preview}
                              </span>
                            ) : null}
                            {timestamp && !projectMode ? (
                              <span className="block w-full truncate text-[11px] leading-4 text-muted-foreground/58">
                                {timestamp}
                              </span>
                            ) : null}
                          </button>
                          <SessionActivityIndicator state={activityState} />
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger
                              className={cn(
                                "sidebar-icon-button inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/75 opacity-40 transition-opacity",
                                "hover:text-sidebar-foreground group-hover:opacity-100",
                                "focus-visible:opacity-100",
                                active && "opacity-100",
                              )}
                              aria-label={actionsLabel}
                              title={actionsLabel}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className={ACTION_MENU_CONTENT_CLASS}
                              portalContainer={actionMenuPortalContainer}
                              onCloseAutoFocus={(event) => event.preventDefault()}
                            >
                              <DropdownMenuItem
                                onSelect={() => onTogglePin(s.key)}
                                className={ACTION_MENU_ITEM_CLASS}
                              >
                                {isPinned ? (
                                  <PinOff className="h-4 w-4 shrink-0" />
                                ) : (
                                  <Pin className="h-4 w-4 shrink-0" />
                                )}
                                {isPinned ? t("chat.unpin") : t("chat.pin")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => onRequestRename(s.key, title)}
                                className={ACTION_MENU_ITEM_CLASS}
                              >
                                <Pencil className="h-4 w-4 shrink-0" />
                                {t("chat.rename")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => onToggleArchive(s.key)}
                                className={ACTION_MENU_ITEM_CLASS}
                              >
                                {isArchived ? (
                                  <ArchiveRestore className="h-4 w-4 shrink-0" />
                                ) : (
                                  <Archive className="h-4 w-4 shrink-0" />
                                )}
                                {isArchived ? t("chat.unarchive") : t("chat.archive")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  window.setTimeout(() => onRequestDelete(s.key, title), 0);
                                }}
                                className={cn(
                                  ACTION_MENU_ITEM_CLASS,
                                  "text-destructive focus:text-destructive",
                                )}
                              >
                                <Trash2 className="h-4 w-4 shrink-0" />
                                {t("chat.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {foldableChatsGroup && canToggleFold ? (
                <ChatsFoldFooter
                  folded={foldedChatsGroup}
                  hiddenCount={hiddenInGroup}
                  onToggle={() => onToggleGroup?.(group.id)}
                />
              ) : null}
            </section>
          );
        })}
        {hiddenSessionCount > 0 ? (
          <div className="px-2 pb-2 pt-1">
            <button
              type="button"
              onClick={() =>
                setVisibleLimit((limit) =>
                  Math.min(totalSessionCount, limit + VISIBLE_SESSIONS_INCREMENT),
                )
              }
              className="h-8 w-full rounded-full text-[12px] font-medium text-muted-foreground/65 transition-colors hover:bg-sidebar-accent/65 hover:text-muted-foreground"
            >
              {t("chat.showMore", { count: hiddenSessionCount })}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
});

interface SidebarModelContentProps {
  model: SidebarModel;
  activeKey: string | null;
  onNewChat?: () => void;
  onAddProjectRequest?: () => void;
  onSelect: (key: string) => void;
  onRequestDelete: (key: string, label: string) => void;
  onTogglePin: (key: string) => void;
  onRequestRename: (key: string, label: string) => void;
  onToggleArchive: (key: string) => void;
  onToggleGroup?: (groupId: string) => void;
  onRequestRenameProject?: (projectKey: string, label: string) => void;
  onNewChatInProject?: (projectPath: string, projectName: string) => void;
  onToggleProjectPin?: (projectKey: string) => void;
  onArchiveProject?: (projectKey: string) => void;
  onRemoveProject?: (projectKey: string) => void;
  pinnedKeys: string[];
  archivedKeys: string[];
  titleOverrides: Record<string, string>;
  collapsedGroups: Record<string, boolean>;
  runningChatIds: string[];
  updatedChatIds: string[];
  compact: boolean;
  showPreviews: boolean;
  showTimestamps: boolean;
  actionMenuPortalContainer?: HTMLElement | null;
  emptyLabel?: string;
  loading?: boolean;
}

function SidebarModelContent({
  model,
  activeKey,
  onNewChat,
  onAddProjectRequest,
  onSelect,
  onRequestDelete,
  onTogglePin,
  onRequestRename,
  onToggleArchive,
  onToggleGroup,
  onRequestRenameProject,
  onNewChatInProject,
  onToggleProjectPin,
  onArchiveProject,
  onRemoveProject,
  pinnedKeys,
  archivedKeys,
  titleOverrides,
  collapsedGroups,
  runningChatIds,
  updatedChatIds,
  compact,
  showPreviews,
  showTimestamps,
  actionMenuPortalContainer,
  emptyLabel,
  loading,
}: SidebarModelContentProps) {
  const { t } = useTranslation();
  const [projectConfirm, setProjectConfirm] = useState<{
    type: "archive" | "remove";
    project: SidebarProjectGroup;
  } | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_SESSIONS);
  const pinned = useMemo(() => new Set(pinnedKeys), [pinnedKeys]);
  const archived = useMemo(() => new Set(archivedKeys), [archivedKeys]);
  const running = useMemo(() => new Set(runningChatIds), [runningChatIds]);
  const updated = useMemo(() => new Set(updatedChatIds), [updatedChatIds]);
  const pinnedLabel = t("chat.groups.pinned");
  const workspaceLabel = t("chat.groups.workspace", { defaultValue: "Workspace" });
  const chatsLabel = t("chat.groups.all");
  const pinnedCollapsed = Boolean(collapsedGroups[PINNED_SECTION_GROUP_ID]);
  const workspaceCollapsed = Boolean(collapsedGroups[WORKSPACE_SECTION_GROUP_ID]);
  const chatsCollapsed = Boolean(collapsedGroups[CHATS_SECTION_GROUP_ID]);

  const renderSession = (session: ChatSummary, projectMode = false) => (
    <ModelSessionRow
      key={session.key}
      session={session}
      active={session.key === activeKey}
      projectMode={projectMode}
      compact={compact}
      isPinned={pinned.has(session.key)}
      isArchived={archived.has(session.key)}
      isRunning={running.has(session.chatId)}
      isUpdated={updated.has(session.chatId) && session.key !== activeKey}
      titleOverrides={titleOverrides}
      showPreviews={showPreviews}
      showTimestamps={showTimestamps}
      actionMenuPortalContainer={actionMenuPortalContainer}
      onSelect={onSelect}
      onRequestDelete={onRequestDelete}
      onTogglePin={onTogglePin}
      onRequestRename={onRequestRename}
      onToggleArchive={onToggleArchive}
    />
  );

  const renderProject = (project: SidebarProjectGroup) => {
    const groupId = `project:${project.key}`;
    const collapsed = Boolean(collapsedGroups[groupId]);
    const archiveCount = project.sessions.length;

    return (
      <section key={project.key} aria-label={project.label}>
        <ProjectGroupHeader
          label={project.label}
          path={project.path}
          collapsed={collapsed}
          isPinned={project.isPinned}
          archiveDisabled={archiveCount === 0}
          onToggle={() => onToggleGroup?.(groupId)}
          onRequestRename={
            onRequestRenameProject
              ? () => onRequestRenameProject(project.key, project.label)
              : undefined
          }
          onTogglePin={
            onToggleProjectPin
              ? () => onToggleProjectPin(project.key)
              : undefined
          }
          onRequestArchive={
            onArchiveProject
              ? () => setProjectConfirm({ type: "archive", project })
              : undefined
          }
          onRequestRemove={
            onRemoveProject
              ? () => setProjectConfirm({ type: "remove", project })
              : undefined
          }
          onNewChat={
            onNewChatInProject
              ? () => onNewChatInProject(project.path, project.label)
              : undefined
          }
          actionMenuPortalContainer={actionMenuPortalContainer}
          updatedAt={
            showTimestamps && project.updatedAt > 0
              ? new Date(project.updatedAt).toISOString()
              : null
          }
        />
        {collapsed ? null : (
          <ul className="space-y-0.5">
            {project.sessions.map((session) => renderSession(session, true))}
          </ul>
        )}
      </section>
    );
  };

  const hasPinned = model.pinnedProjects.length > 0 || model.pinnedChats.length > 0;
  const hasWorkspace = model.workspaceProjects.length > 0;
  const visibleConversations = model.conversations.slice(0, visibleLimit);
  const hasChats = visibleConversations.length > 0;
  const hiddenSessionCount = Math.max(0, model.conversations.length - visibleConversations.length);

  useEffect(() => {
    setVisibleLimit(INITIAL_VISIBLE_SESSIONS);
  }, [model]);

  return (
    <>
      <div className="h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent">
        <div className="min-w-0 space-y-3 px-2 py-1.5">
          {hasPinned ? (
            <section aria-label={pinnedLabel}>
              <ModelSectionHeader
                label={pinnedLabel}
                collapsed={pinnedCollapsed}
                onToggle={onToggleGroup ? () => onToggleGroup(PINNED_SECTION_GROUP_ID) : undefined}
              />
              {pinnedCollapsed ? null : (
                <div className="space-y-2">
                  {model.pinnedProjects.map(renderProject)}
                  {model.pinnedChats.length ? (
                    <ul className="space-y-0.5">
                      {model.pinnedChats.map((session) => renderSession(session))}
                    </ul>
                  ) : null}
                </div>
              )}
            </section>
          ) : null}

          <section aria-label={workspaceLabel}>
              <ModelSectionHeader
                label={workspaceLabel}
                actionLabel={t("chat.addProject", { defaultValue: "Add project" })}
                onAction={onAddProjectRequest}
                collapsed={workspaceCollapsed}
                onToggle={
                  hasWorkspace && onToggleGroup
                    ? () => onToggleGroup(WORKSPACE_SECTION_GROUP_ID)
                    : undefined
                }
              />
            {hasWorkspace && !workspaceCollapsed ? (
              <div className="space-y-2">
                {model.workspaceProjects.map(renderProject)}
              </div>
            ) : loading ? (
              <div className="px-2 py-1 text-[12px] text-muted-foreground">
                {t("chat.loading")}
              </div>
            ) : null}
          </section>

          <section aria-label={chatsLabel}>
              <ModelSectionHeader
                label={chatsLabel}
                actionLabel={t("chat.newPlainChat", { defaultValue: "New plain chat" })}
                onAction={onNewChat}
                collapsed={chatsCollapsed}
                onToggle={
                  hasChats && onToggleGroup
                    ? () => onToggleGroup(CHATS_SECTION_GROUP_ID)
                    : undefined
                }
              />
            {hasChats && !chatsCollapsed ? (
              <ul className="space-y-0.5">
                {visibleConversations.map((session) => renderSession(session))}
              </ul>
            ) : !hasPinned && !hasWorkspace && !loading ? (
              <div className="px-2 py-1 text-[12px] leading-5 text-muted-foreground/80">
                {emptyLabel ?? t("chat.noSessions")}
              </div>
            ) : null}
          </section>
          {hiddenSessionCount > 0 && !chatsCollapsed ? (
            <div className="px-2 pb-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  setVisibleLimit((limit) =>
                    Math.min(model.conversations.length, limit + VISIBLE_SESSIONS_INCREMENT),
                  )
                }
                className="h-8 w-full rounded-full text-[12px] font-medium text-muted-foreground/65 transition-colors hover:bg-sidebar-accent/65 hover:text-muted-foreground"
              >
                {t("chat.showMore", { count: hiddenSessionCount })}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <ProjectActionConfirmDialog
        action={projectConfirm}
        onCancel={() => setProjectConfirm(null)}
        onArchiveProject={onArchiveProject}
        onRemoveProject={onRemoveProject}
      />
    </>
  );
}

function ModelSectionHeader({
  label,
  actionLabel,
  onAction,
  collapsed,
  onToggle,
}: {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const canToggle = Boolean(onToggle);

  return (
    <div className="sidebar-section-label group/section flex min-w-0 items-center gap-2 px-2 pb-1 text-[12px] font-medium text-muted-foreground/65">
      {canToggle ? (
        <button
          type="button"
          aria-expanded={!collapsed}
          data-state={collapsed ? "collapsed" : "expanded"}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-0.5 py-0.5 text-left transition-colors hover:text-sidebar-foreground focus-visible:text-sidebar-foreground"
        >
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <CollapseIndicator
            collapsed={Boolean(collapsed)}
            className="opacity-0 group-hover/section:opacity-100 group-focus-within/section:opacity-100"
          />
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      )}
      {actionLabel && onAction ? (
        <button
          type="button"
          aria-label={actionLabel}
          title={actionLabel}
          onClick={onAction}
          className="sidebar-icon-button inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:text-sidebar-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function CollapseIndicator({
  collapsed,
  className,
}: {
  collapsed: boolean;
  className?: string;
}) {
  const Icon = collapsed ? ChevronRight : ChevronDown;

  return (
    <Icon
      data-collapse-indicator
      data-state={collapsed ? "collapsed" : "expanded"}
      className={cn(
        "h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-opacity",
        className,
      )}
      aria-hidden
    />
  );
}

function ModelSessionRow({
  session,
  active,
  projectMode,
  compact,
  isPinned,
  isArchived,
  isRunning,
  isUpdated,
  titleOverrides,
  showPreviews,
  showTimestamps,
  actionMenuPortalContainer,
  onSelect,
  onRequestDelete,
  onTogglePin,
  onRequestRename,
  onToggleArchive,
}: {
  session: ChatSummary;
  active: boolean;
  projectMode: boolean;
  compact: boolean;
  isPinned: boolean;
  isArchived: boolean;
  isRunning: boolean;
  isUpdated: boolean;
  titleOverrides: Record<string, string>;
  showPreviews: boolean;
  showTimestamps: boolean;
  actionMenuPortalContainer?: HTMLElement | null;
  onSelect: (key: string) => void;
  onRequestDelete: (key: string, label: string) => void;
  onTogglePin: (key: string) => void;
  onRequestRename: (key: string, label: string) => void;
  onToggleArchive: (key: string) => void;
}) {
  const { t } = useTranslation();
  const fallbackTitle = t("chat.fallbackTitle", { id: session.chatId.slice(0, 6) });
  const generatedTitle = session.title?.trim() || "";
  const title = displayTitle(session, titleOverrides, t("chat.newChat"));
  const tooltipTitle =
    titleOverrides[session.key]?.trim()
    || generatedTitle
    || deriveTitle(session.preview, fallbackTitle);
  const preview = session.preview.trim();
  const showPreview = showPreviews && preview && preview !== title;
  const timestamp = showTimestamps
    ? relativeTime(session.updatedAt ?? session.createdAt)
    : "";
  const activityState = isRunning ? "running" : isUpdated && !active ? "updated" : null;
  const pinLabel = `${isPinned ? t("chat.unpin") : t("chat.pin")} ${title}`;
  const actionsLabel = t("chat.actions", { title });

  return (
    <li className="min-w-0">
      <div
        className={cn(
          "sidebar-chat-row group flex min-w-0 max-w-full items-center gap-2 rounded-xl px-2 text-[13px] transition-[background-color,border-color,box-shadow,color]",
          compact ? "min-h-7" : "min-h-8",
          projectMode && "sidebar-chat-row--project",
          active
            ? "sidebar-chat-row--active text-sidebar-accent-foreground"
            : "text-sidebar-foreground/82 hover:text-sidebar-foreground",
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(session.key)}
          title={tooltipTitle}
          className={cn(
            "min-w-0 flex-1 overflow-hidden text-left",
            compact ? "py-1" : "py-1.5",
            projectMode && "pl-7",
          )}
        >
          {projectMode ? (
            <span className="flex w-full min-w-0 items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate font-medium leading-5">
                {title}
              </span>
              {timestamp ? (
                <span className="shrink-0 text-[11.5px] font-medium text-muted-foreground/58">
                  {timestamp}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="block w-full truncate font-medium leading-5">
              {title}
            </span>
          )}
          {showPreview ? (
            <span className="block w-full truncate text-[11.5px] leading-4 text-muted-foreground/72">
              {preview}
            </span>
          ) : null}
          {timestamp && !projectMode ? (
            <span className="block w-full truncate text-[11px] leading-4 text-muted-foreground/58">
              {timestamp}
            </span>
          ) : null}
        </button>
        <SessionActivityIndicator state={activityState} />
        <button
          type="button"
          aria-label={pinLabel}
          title={pinLabel}
          onClick={() => onTogglePin(session.key)}
          className={cn(
            "sidebar-icon-button inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/75 opacity-100 transition-opacity sm:opacity-0",
            "hover:text-sidebar-foreground sm:group-hover:opacity-100 focus-visible:opacity-100",
            (active || isPinned) && "opacity-100 sm:opacity-100",
          )}
        >
          {isPinned ? (
            <PinOff className="h-3.5 w-3.5" />
          ) : (
            <Pin className="h-3.5 w-3.5" />
          )}
        </button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            className={cn(
              "sidebar-icon-button inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/75 opacity-40 transition-opacity",
              "hover:text-sidebar-foreground group-hover:opacity-100",
              "focus-visible:opacity-100",
              active && "opacity-100",
            )}
            aria-label={actionsLabel}
            title={actionsLabel}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={ACTION_MENU_CONTENT_CLASS}
            portalContainer={actionMenuPortalContainer}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <DropdownMenuItem
              onSelect={() => onRequestRename(session.key, title)}
              className={ACTION_MENU_ITEM_CLASS}
            >
              <Pencil className="h-4 w-4 shrink-0" />
              {t("chat.rename")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onToggleArchive(session.key)}
              className={ACTION_MENU_ITEM_CLASS}
            >
              {isArchived ? (
                <ArchiveRestore className="h-4 w-4 shrink-0" />
              ) : (
                <Archive className="h-4 w-4 shrink-0" />
              )}
              {isArchived ? t("chat.unarchive") : t("chat.archive")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                window.setTimeout(() => onRequestDelete(session.key, title), 0);
              }}
              className={cn(
                ACTION_MENU_ITEM_CLASS,
                "text-destructive focus:text-destructive",
              )}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              {t("chat.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function ProjectActionConfirmDialog({
  action,
  onCancel,
  onArchiveProject,
  onRemoveProject,
}: {
  action: { type: "archive" | "remove"; project: SidebarProjectGroup } | null;
  onCancel: () => void;
  onArchiveProject?: (projectKey: string) => void;
  onRemoveProject?: (projectKey: string) => void;
}) {
  const { t } = useTranslation();
  const project = action?.project;
  const archiveCount = project?.sessions.length ?? 0;
  const isArchive = action?.type === "archive";
  const archiveNoun = archiveCount === 1 ? "chat" : "chats";
  const title = isArchive
    ? t("chat.projectArchiveTitle", {
        count: archiveCount,
        defaultValue: `Archive ${archiveCount} ${archiveNoun}?`,
      })
    : t("chat.projectRemoveTitle", {
        project: project?.label ?? "",
        defaultValue: `Remove ${project?.label ?? ""} from sidebar?`,
      });

  return (
    <AlertDialog open={Boolean(action)} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <AlertDialogContent className="confirm-dialog-shell w-[min(calc(100vw-2rem),25rem)] p-5">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="leading-6">
            {isArchive
              ? t("chat.projectArchiveDescription", {
                  defaultValue:
                    "These chats will be archived. You can find them later in Settings under Archived conversations.",
                })
              : t("chat.projectRemoveDescription", {
                  defaultValue:
                    "This removes the project entry from the sidebar. The disk files will not be deleted. Project chats will not be deleted or archived.",
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-5">
          <AlertDialogCancel onClick={onCancel}>
            {t("deleteConfirm.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!project || !action) return;
              if (action.type === "archive") {
                onArchiveProject?.(project.key);
              } else {
                onRemoveProject?.(project.key);
              }
              onCancel();
            }}
            className={isArchive ? undefined : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
          >
            {isArchive
              ? t("chat.projectArchiveConfirm", { defaultValue: "Archive all" })
              : t("chat.projectRemoveConfirm", { defaultValue: "Remove from sidebar" })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ProjectGroupHeader({
  label,
  path,
  collapsed,
  isPinned,
  archiveDisabled,
  onToggle,
  onRequestRename,
  onTogglePin,
  onRequestArchive,
  onRequestRemove,
  onNewChat,
  actionMenuPortalContainer,
  updatedAt,
}: {
  label: string;
  path?: string;
  collapsed: boolean;
  isPinned?: boolean;
  archiveDisabled?: boolean;
  onToggle: () => void;
  onRequestRename?: () => void;
  onTogglePin?: () => void;
  onRequestArchive?: () => void;
  onRequestRemove?: () => void;
  onNewChat?: () => void;
  actionMenuPortalContainer?: HTMLElement | null;
  updatedAt?: string | null;
}) {
  const { t } = useTranslation();
  const hasMenu = Boolean(
    onRequestRename || onTogglePin || onRequestArchive || onRequestRemove,
  );
  const actionsLabel = t("chat.actions", { title: label });

  return (
    <div
      title={path}
      className="sidebar-project-header group group/project flex min-w-0 items-center gap-1 px-1 pb-1 pt-1 text-[12px] font-medium text-muted-foreground/78"
    >
      <button
        type="button"
        aria-expanded={!collapsed}
        data-state={collapsed ? "collapsed" : "expanded"}
        onClick={onToggle}
        className={cn(
          "sidebar-project-toggle flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors",
          "hover:text-sidebar-foreground focus-visible:text-sidebar-foreground",
          collapsed && "text-sidebar-foreground/88",
        )}
      >
        <Folder className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <CollapseIndicator
          collapsed={collapsed}
          className="opacity-0 group-hover/project:opacity-100 group-focus-within/project:opacity-100"
        />
      </button>
      {updatedAt ? (
        <span className="shrink-0 text-[11px] text-muted-foreground/55">
          {relativeTime(updatedAt)}
        </span>
      ) : null}
      {hasMenu ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            className={cn(
              "sidebar-icon-button inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 opacity-40 transition-opacity",
              "hover:text-sidebar-foreground group-hover:opacity-100 focus-visible:opacity-100",
            )}
            aria-label={actionsLabel}
            title={actionsLabel}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={ACTION_MENU_CONTENT_CLASS}
            portalContainer={actionMenuPortalContainer}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            {onRequestRename ? (
              <DropdownMenuItem onSelect={onRequestRename} className={ACTION_MENU_ITEM_CLASS}>
                <Pencil className="h-4 w-4 shrink-0" />
                {t("chat.rename")}
              </DropdownMenuItem>
            ) : null}
            {onTogglePin ? (
              <DropdownMenuItem onSelect={onTogglePin} className={ACTION_MENU_ITEM_CLASS}>
                {isPinned ? (
                  <PinOff className="h-4 w-4 shrink-0" />
                ) : (
                  <Pin className="h-4 w-4 shrink-0" />
                )}
                {isPinned ? t("chat.unpin") : t("chat.pin")}
              </DropdownMenuItem>
            ) : null}
            {onRequestArchive ? (
              <DropdownMenuItem
                disabled={archiveDisabled}
                onSelect={onRequestArchive}
                className={ACTION_MENU_ITEM_CLASS}
              >
                <Archive className="h-4 w-4 shrink-0" />
                {t("chat.archive")}
              </DropdownMenuItem>
            ) : null}
            {onRequestRemove ? (
              <DropdownMenuItem
                onSelect={onRequestRemove}
                className={cn(
                  ACTION_MENU_ITEM_CLASS,
                  "text-destructive focus:text-destructive",
                )}
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                {t("chat.removeFromSidebar", { defaultValue: "Remove from sidebar" })}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {onNewChat ? (
        <button
          type="button"
          aria-label={t("chat.newInProject", { project: label })}
          title={t("chat.newInProject", { project: label })}
          onClick={(event) => {
            event.stopPropagation();
            onNewChat();
          }}
          className={cn(
            "sidebar-icon-button inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 opacity-40 transition-opacity",
            "hover:text-sidebar-foreground group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function ChatsGroupHeader({ label }: { label: string }) {
  return (
    <div className="sidebar-section-label px-2 pb-1 text-[12px] font-medium text-muted-foreground/65">
      {label}
    </div>
  );
}

function ChatsFoldFooter({
  folded,
  hiddenCount,
  onToggle,
}: {
  folded: boolean;
  hiddenCount: number;
  onToggle: () => void;
}) {
  const { t, i18n } = useTranslation();
  const collapsedFallback = i18n.resolvedLanguage?.startsWith("zh")
    ? `已折叠 ${hiddenCount} 个对话`
    : `${hiddenCount} hidden chats`;

  return (
    <div className="px-2 pb-1 pt-1">
      <button
        type="button"
        onClick={onToggle}
        className="h-7 w-full rounded-xl text-left text-[12px] font-medium text-muted-foreground/65 transition-colors hover:bg-sidebar-accent/50 hover:text-muted-foreground"
      >
        <span className="px-2">
          {folded
            ? t("chat.collapsed", {
                count: hiddenCount,
                defaultValue: collapsedFallback,
              })
            : t("chat.showLess")}
        </span>
      </button>
    </div>
  );
}

function SessionActivityIndicator({
  state,
}: {
  state: "running" | "updated" | null;
}) {
  const { t } = useTranslation();

  if (state === "running") {
    const label = t("chat.activity.running");
    return (
      <span
        aria-label={label}
        title={label}
        className="grid h-4 w-4 shrink-0 place-items-center"
      >
        <span className="session-activity-indicator__spinner h-3 w-3 animate-spin rounded-full border [animation-duration:1.4s] motion-reduce:animate-none" />
      </span>
    );
  }

  if (state === "updated") {
    const label = t("chat.activity.updated");
    return (
      <span
        aria-label={label}
        title={label}
        className="grid h-4 w-4 shrink-0 place-items-center"
      >
        <span className="session-activity-indicator__dot h-2 w-2 rounded-full" />
      </span>
    );
  }

  return <span className="h-4 w-4 shrink-0" aria-hidden="true" />;
}

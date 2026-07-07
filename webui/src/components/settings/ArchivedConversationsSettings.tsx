import { useMemo, useState } from "react";
import {
  ArchiveRestore,
  Ellipsis,
  Folder,
  MessageSquare,
  Search,
  Trash2,
} from "lucide-react";

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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { displayTitle } from "@/lib/chat-groups";
import { fmtDateTime } from "@/lib/format";
import type {
  ArchivedConversationGroup,
  SidebarProjectOption,
} from "@/lib/sidebar-model";
import type { ChatSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { shortWorkspacePath } from "@/lib/workspace";

interface ArchivedConversationsSettingsProps {
  groups: ArchivedConversationGroup[];
  totalCount: number;
  projectOptions: SidebarProjectOption[];
  titleOverrides?: Record<string, string>;
  onUnarchiveChat?: (key: string) => void;
  onDeleteArchivedChats?: (keys: string[]) => Promise<void> | void;
}

interface PendingDelete {
  kind: "all" | "group" | "chat";
  keys: string[];
  label: string;
}

const ALL_PROJECTS = "all";
const NO_PROJECT = "no-project";

export function ArchivedConversationsSettings({
  groups,
  totalCount,
  projectOptions,
  titleOverrides = {},
  onUnarchiveChat,
  onDeleteArchivedChats,
}: ArchivedConversationsSettingsProps) {
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState(ALL_PROJECTS);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const total = totalCount || groups.reduce((sum, group) => sum + group.sessions.length, 0);
  const optionByKey = useMemo(
    () => new Map(projectOptions.map((option) => [option.key, option])),
    [projectOptions],
  );
  const allKeys = useMemo(
    () => groups.flatMap((group) => group.sessions.map((session) => session.key)),
    [groups],
  );
  const filterOptions = useMemo(
    () => [
      { key: ALL_PROJECTS, label: "All projects", detail: null as string | null },
      ...groups.map((group) => {
        if (!group.projectPath) {
          return { key: NO_PROJECT, label: "No project chats", detail: null };
        }
        const option = optionByKey.get(group.key);
        return {
          key: group.key,
          label: option?.label ?? group.label,
          detail: option?.shortPath ?? shortWorkspacePath(group.projectPath),
        };
      }),
    ],
    [groups, optionByKey],
  );
  const activeFilterLabel =
    filterOptions.find((option) => option.key === projectFilter)?.label ?? "All projects";
  const normalizedQuery = query.trim().toLocaleLowerCase("en");
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      sessions: group.sessions.filter((session) => {
        if (projectFilter === NO_PROJECT && group.projectPath) return false;
        if (
          projectFilter !== ALL_PROJECTS
          && projectFilter !== NO_PROJECT
          && group.key !== projectFilter
        ) {
          return false;
        }
        if (!normalizedQuery) return true;
        const haystack = [
          archivedTitle(session, titleOverrides),
          session.preview,
          group.label,
          group.projectPath ?? "",
        ].join(" ").toLocaleLowerCase("en");
        return haystack.includes(normalizedQuery);
      }),
    }))
    .filter((group) => group.sessions.length > 0);

  const requestDelete = (kind: PendingDelete["kind"], keys: string[], label: string) => {
    if (!keys.length) return;
    setPendingDelete({ kind, keys, label });
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !onDeleteArchivedChats) return;
    setDeleting(true);
    try {
      await onDeleteArchivedChats(pendingDelete.keys);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[22px] border border-border/45 bg-card/86 p-3 shadow-[0_18px_65px_rgba(15,23,42,0.075)] sm:flex-row sm:items-center">
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-border/55 bg-background/80 px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search archived chats"
            placeholder="Search archived chats"
            className="h-8 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 justify-between rounded-full px-3 text-[13px] sm:min-w-[12rem]"
            >
              <span className="truncate">{activeFilterLabel}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-[18px]">
            {filterOptions.map((option) => (
              <DropdownMenuItem
                key={option.key}
                aria-label={option.label}
                onSelect={() => setProjectFilter(option.key)}
                className="flex cursor-default flex-col items-start rounded-[12px]"
              >
                <span className="text-[13px] font-medium">{option.label}</span>
                {option.detail ? (
                  <span aria-hidden className="text-[11.5px] text-muted-foreground">
                    {option.detail}
                  </span>
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          disabled={!allKeys.length || !onDeleteArchivedChats}
          onClick={() => requestDelete("all", allKeys, "all archived conversations")}
          className="h-10 rounded-full bg-destructive/10 px-3 text-[13px] font-semibold text-destructive shadow-none hover:bg-destructive/15"
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          Delete all archived conversations
        </Button>
      </div>

      {total === 0 ? (
        <EmptyArchivedState text="No archived conversations." />
      ) : visibleGroups.length === 0 ? (
        <EmptyArchivedState text="No archived conversations match your filters." />
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-border/45 bg-card/86 shadow-[0_18px_65px_rgba(15,23,42,0.075)]">
          {visibleGroups.map((group) => {
            const groupKeys = group.sessions.map((session) => session.key);
            return (
              <section key={group.key} className="border-b border-border/45 last:border-b-0">
                <div className="flex min-h-12 items-center gap-3 bg-muted/35 px-4 py-2">
                  {group.projectPath ? (
                    <Folder className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  ) : (
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-foreground">
                      {group.label}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {group.sessions.length} {group.sessions.length === 1 ? "chat" : "chats"}
                    </div>
                  </div>
                  {group.projectPath ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`More actions for ${group.label}`}
                          className="h-8 w-8 rounded-full text-muted-foreground hover:bg-background/80 hover:text-foreground"
                        >
                          <Ellipsis className="h-4 w-4" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 rounded-[18px]">
                        <DropdownMenuItem
                          onSelect={() => requestDelete("group", groupKeys, group.label)}
                          className="cursor-default rounded-[12px] text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                          Delete this project's archived chats
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
                <div className="divide-y divide-border/35">
                  {group.sessions.map((session) => (
                    <ArchivedConversationRow
                      key={session.key}
                      session={session}
                      title={archivedTitle(session, titleOverrides)}
                      onUnarchiveChat={onUnarchiveChat}
                      onDelete={() => requestDelete("chat", [session.key], archivedTitle(session, titleOverrides))}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <DeleteArchivedDialog
        pending={pendingDelete}
        deleting={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function ArchivedConversationRow({
  session,
  title,
  onUnarchiveChat,
  onDelete,
}: {
  session: ChatSummary;
  title: string;
  onUnarchiveChat?: (key: string) => void;
  onDelete: () => void;
}) {
  return (
    <div
      data-archived-row
      tabIndex={0}
      className="group flex min-h-[76px] items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted/35 focus-visible:bg-muted/35"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-foreground">{title}</div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
          <span>{fmtDateTime(session.updatedAt ?? session.createdAt)}</span>
          {session.preview ? <span className="truncate">{session.preview}</span> : null}
        </div>
      </div>
      <div
        role="group"
        aria-label={`Actions for ${title}`}
        className={cn(
          "flex shrink-0 items-center gap-1 opacity-0 transition-opacity",
          "group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!onUnarchiveChat}
          aria-label={`Unarchive ${title}`}
          onClick={() => onUnarchiveChat?.(session.key)}
          className="h-8 w-8 rounded-full text-muted-foreground hover:bg-background/85 hover:text-foreground"
        >
          <ArchiveRestore className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Delete ${title}`}
          onClick={onDelete}
          className="h-8 w-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function EmptyArchivedState({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-border/45 bg-card/86 px-4 py-10 text-center text-[13px] text-muted-foreground shadow-[0_18px_65px_rgba(15,23,42,0.075)]">
      {text}
    </div>
  );
}

function DeleteArchivedDialog({
  pending,
  deleting,
  onCancel,
  onConfirm,
}: {
  pending: PendingDelete | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const title = pending
    ? pending.kind === "all"
      ? "Delete all archived conversations?"
      : pending.kind === "group"
        ? "Delete this project's archived conversations?"
        : `Delete ${pending.label}?`
    : "";
  return (
    <AlertDialog open={!!pending} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <AlertDialogContent className="w-[min(calc(100vw-2rem),26rem)] rounded-[26px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            This only deletes archived conversations. It will not delete project files on disk or
            affect unarchived conversations.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting} onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete archived conversations
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function archivedTitle(session: ChatSummary, titleOverrides: Record<string, string>): string {
  return displayTitle(session, titleOverrides, "New chat");
}

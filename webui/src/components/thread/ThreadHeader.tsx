import { Menu, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HEADER_ICON_BUTTON_CLASS =
  "h-8 w-8 rounded-full text-muted-foreground/82 transition-[color,background-color,box-shadow] hover:bg-accent/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/45";

interface ThreadHeaderProps {
  title: string;
  onToggleSidebar: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  hideSidebarToggleForHostChrome?: boolean;
  hostChromeTitleInset?: boolean;
  hideThemeButton?: boolean;
  minimal?: boolean;
  promptNavigatorAction?: ReactNode;
  sessionInfoAction?: ReactNode;
}

export function ThreadHeader({
  title,
  onToggleSidebar,
  theme,
  onToggleTheme,
  hideSidebarToggleForHostChrome = false,
  hostChromeTitleInset = false,
  hideThemeButton = false,
  minimal = false,
  promptNavigatorAction,
  sessionInfoAction,
}: ThreadHeaderProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "relative z-10 flex min-h-11 items-center justify-between gap-3 border-b border-border/45 bg-background/92 px-3 py-2 supports-[backdrop-filter]:bg-background/86 supports-[backdrop-filter]:backdrop-blur-md",
        minimal && "h-11",
        !minimal && hostChromeTitleInset && "lg:pl-[128px]",
      )}
    >
      <div className="relative flex min-w-0 flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("thread.header.toggleSidebar")}
          onClick={onToggleSidebar}
          className={cn(
            HEADER_ICON_BUTTON_CLASS,
            hideSidebarToggleForHostChrome && "lg:hidden",
          )}
        >
          <Menu className="h-3.5 w-3.5" />
        </Button>
        {!minimal ? (
          <div className="flex min-w-0 max-w-full items-center rounded-lg px-2 py-1 text-[12.5px] font-medium text-foreground/66">
            <span className="max-w-[min(49.5rem,calc(100vw-11rem))] truncate">{title}</span>
          </div>
        ) : null}
      </div>

      <div className="ml-2 flex shrink-0 items-center gap-1">
        {sessionInfoAction}
        {promptNavigatorAction}
        {!hideThemeButton ? (
          <ThemeButton
            theme={theme}
            onToggleTheme={onToggleTheme}
            label={t("thread.header.toggleTheme")}
          />
        ) : null}
      </div>

      {!minimal ? (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-full h-4" />
      ) : null}
    </div>
  );
}

function ThemeButton({
  theme,
  onToggleTheme,
  label,
  className,
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  label: string;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={onToggleTheme}
      className={cn(
        "host-no-drag",
        HEADER_ICON_BUTTON_CLASS,
        className,
      )}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

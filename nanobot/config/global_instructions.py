"""Global instruction storage backends."""

from __future__ import annotations

from contextlib import suppress
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


@dataclass(frozen=True)
class GlobalInstructionsDocument:
    """Global instruction content plus its user-visible source."""

    source: str
    content: str
    exists: bool


class GlobalInstructionsStore(Protocol):
    """Storage boundary for instance- or account-level global instructions."""

    def read(self) -> GlobalInstructionsDocument:
        """Return the current global instruction document."""
        ...

    def write(self, content: str) -> bool:
        """Persist content and return whether anything changed."""
        ...


class LocalFileGlobalInstructionsStore:
    """Store global instructions in a local AGENTS.md file."""

    def __init__(self, path: Path):
        self.path = path

    def read(self) -> GlobalInstructionsDocument:
        with suppress(FileNotFoundError):
            return GlobalInstructionsDocument(
                source=str(self.path),
                content=self.path.read_text(encoding="utf-8"),
                exists=True,
            )
        return GlobalInstructionsDocument(source=str(self.path), content="", exists=False)

    def write(self, content: str) -> bool:
        if self.read().content == content:
            return False
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(content, encoding="utf-8")
        return True


def get_global_instructions_store() -> GlobalInstructionsStore:
    """Return the active global instruction store for this runtime."""
    from nanobot.config.paths import get_global_agents_path

    return LocalFileGlobalInstructionsStore(get_global_agents_path())

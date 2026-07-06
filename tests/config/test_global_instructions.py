"""Tests for global instruction storage backends."""

from nanobot.config.global_instructions import LocalFileGlobalInstructionsStore


def test_local_file_global_instructions_store_round_trips_content(tmp_path):
    path = tmp_path / "runtime" / "AGENTS.md"
    store = LocalFileGlobalInstructionsStore(path)

    missing = store.read()
    assert missing.source == str(path)
    assert missing.content == ""
    assert missing.exists is False

    assert store.write("Apply KISS globally.") is True
    saved = store.read()
    assert saved.source == str(path)
    assert saved.content == "Apply KISS globally."
    assert saved.exists is True
    assert path.read_text(encoding="utf-8") == "Apply KISS globally."

    assert store.write("Apply KISS globally.") is False

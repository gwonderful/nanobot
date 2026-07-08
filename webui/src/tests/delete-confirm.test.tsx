import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeleteConfirm } from "@/components/DeleteConfirm";

describe("DeleteConfirm", () => {
  it("uses the shared restrained confirmation dialog surface", () => {
    render(
      <DeleteConfirm
        open
        title="Research notes"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("alertdialog", { name: "Delete this chat?" });
    expect(dialog).toHaveClass("confirm-dialog-shell");
    expect(dialog.className).not.toMatch(/border-white|rounded-\[28px\]|shadow-\[0_24px_80px/i);
  });
});

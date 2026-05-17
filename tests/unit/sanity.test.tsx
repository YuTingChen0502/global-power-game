import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Phase 0 setup", () => {
  it("renders the UI component baseline", () => {
    render(<Button>Ready</Button>);

    expect(screen.getByRole("button", { name: "Ready" })).toBeInTheDocument();
  });
});

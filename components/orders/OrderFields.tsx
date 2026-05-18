"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
};

export function LabelRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function SelectField({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-10 w-full rounded-md border border-white/15 bg-slate-950 px-2 text-sm text-white outline-none focus:border-cyan-300",
        className,
      )}
    >
      <option value="">-</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

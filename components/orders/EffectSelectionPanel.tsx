"use client";

import { Badge } from "@/components/ui/badge";

export function EffectSelectionPanel() {
  return (
    <section className="rounded-md border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-200">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">Effects</h2>
        <Badge variant="outline" className="border-white/30 text-slate-100">
          Stub
        </Badge>
      </div>
      <p className="mt-2 text-slate-300">No pending selections.</p>
    </section>
  );
}

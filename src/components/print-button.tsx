"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print / save PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary no-print">
      <Printer className="size-4" /> {label}
    </button>
  );
}

"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { QuickTransactionForm } from "@/components/transactions/quick-transaction-form";

interface QuickTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; type: string }[];
}

export function QuickTransactionDialog({
  open,
  onClose,
  accounts,
  categories,
}: QuickTransactionDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Zamknij"
      />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Szybki zapis</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <QuickTransactionForm accounts={accounts} categories={categories} />
      </div>
    </div>
  );
}

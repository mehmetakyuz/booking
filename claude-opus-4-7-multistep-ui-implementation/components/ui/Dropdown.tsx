"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Custom dropdown (not a native select). Children render inside the panel.
export function Dropdown({
  label,
  open,
  onOpenChange,
  children,
  disabled = false,
}: {
  label: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onOpenChange]);

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="dropdown__trigger"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
      >
        <span>{label}</span>
        <ChevronDown size={18} />
      </button>
      {open && <div className="dropdown__panel">{children}</div>}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  hint?: string;
}

// Custom dropdown (not a native select). Used for airport and nights filters.
export default function Dropdown({
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  value: string | null;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="dropdown-value">
          {selected ? selected.label : placeholder ?? "Select"}
        </span>
        <ChevronDown size={16} className="dropdown-chevron" />
      </button>
      {open ? (
        <div className="dropdown-panel" role="listbox">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              className={`dropdown-option${o.value === value ? " is-selected" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              role="option"
              aria-selected={o.value === value}
            >
              <span>{o.label}</span>
              {o.hint ? <span className="dropdown-option-hint">{o.hint}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

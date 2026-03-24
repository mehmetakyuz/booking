"use client";

import { useEffect } from "react";
import { IconClose } from "./icons/Icons";

export interface ModalProps {
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  header?: React.ReactNode;
}

export function Modal({ onClose, title, children, header }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>
        {(title || header) && (
          <div className="modal-header">
            {header || <h2 className="modal-title">{title}</h2>}
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

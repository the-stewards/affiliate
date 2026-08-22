"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function ConfirmButton({
  confirmText,
  children,
  ...props
}: { confirmText: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

/**
 * Shared button primitive. Every control renders a real <button> with a visible
 * border, hover, pressed and disabled state so it never reads as plain text.
 */
const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-[12px] font-medium " +
  "cursor-pointer whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iris " +
  "active:translate-y-px " +
  "disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45 disabled:shadow-none";

const VARIANTS: Record<Variant, string> = {
  primary:
    "border border-iris bg-iris text-on-iris shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_2px_12px_rgba(143,156,255,0.30)] " +
    "hover:bg-[#a3aeff] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_4px_18px_rgba(143,156,255,0.42)] " +
    "active:bg-[#7b88f5] active:shadow-[inset_0_2px_6px_rgba(13,16,48,0.45)]",
  secondary:
    "border border-line-strong bg-raised text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] " +
    "hover:border-iris hover:bg-[#2a3157] " +
    "active:bg-[#222848] active:shadow-none",
  ghost:
    "border border-transparent bg-transparent text-iris underline decoration-iris/45 underline-offset-4 " +
    "hover:border-iris/35 hover:bg-iris/12 hover:decoration-iris " +
    "active:bg-iris/20",
  danger:
    "border border-pause/45 bg-transparent text-pause " +
    "hover:border-pause hover:bg-pause/12 " +
    "active:bg-pause/20",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-11 px-3 text-sm",
  md: "min-h-11 px-4 text-[15px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <button type="button" {...rest} className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim()}>
      {children}
    </button>
  );
}

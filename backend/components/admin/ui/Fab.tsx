"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Spinner } from "./Primitives";

type FabProps = {
  label: string;
  variant?: "primary" | "secondary";
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
};

export function Fab({ label, variant = "primary", loading, children, onClick, href }: FabProps) {
  const className = clsx(
    "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl shadow-lg transition-transform",
    "hover:scale-105 active:scale-95 disabled:opacity-60",
    "motion-safe:animate-[fab-pop_0.35s_ease-out_backwards]",
    variant === "primary" ? "bg-gold text-white hover:bg-gold-bright" : "bg-espresso text-white hover:opacity-90"
  );

  const content = loading ? <Spinner className="h-5 w-5" /> : children;
  const style = { animationDelay: variant === "primary" ? "80ms" : "0ms" };

  if (href) {
    return (
      <Link href={href} aria-label={label} className={className} style={style}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      className={className}
      style={style}
    >
      {content}
    </button>
  );
}

/**
 * Contenedor fijo, esquina inferior derecha. Respeta el notch/home indicator.
 * Por defecto solo se ve en movil (`onlyMobile`); paginas con una unica accion
 * (sin version "normal" en escritorio) pueden pasar `onlyMobile={false}` para
 * que el mismo boton flotante quede visible tambien en escritorio.
 */
export function FabGroup({
  children,
  onlyMobile = true,
}: {
  children: React.ReactNode;
  onlyMobile?: boolean;
}) {
  return (
    <div
      className={clsx(
        "fixed right-4 z-30 flex flex-col items-end gap-3",
        onlyMobile && "sm:hidden"
      )}
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {children}
    </div>
  );
}

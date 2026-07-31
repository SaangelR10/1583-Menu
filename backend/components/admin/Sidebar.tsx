"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useAuth } from "@/components/admin/AuthProvider";

const NAV_ITEMS = [
  { href: "/admin", label: "Resumen", exact: true },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/tienda", label: "Info. de la tienda" },
  { href: "/admin/audit-logs", label: "Actividad" },
  { href: "/admin/settings", label: "Ajustes" },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAuth();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 sm:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex h-screen w-72 max-w-[85vw] shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 ease-out sm:static sm:z-auto sm:w-64 sm:max-w-none sm:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <div>
            <p className="font-display text-lg font-semibold text-ink">Café 1583</p>
            <p className="text-xs text-ink-muted">Panel de administración</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar menu"
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted sm:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-gold text-white" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border px-5 py-4">
          <p className="truncate text-xs text-ink-muted">{admin?.email}</p>
          <button
            onClick={async () => {
              await logout();
              router.push("/admin/login");
            }}
            className="mt-2 text-sm font-medium text-danger hover:underline"
          >
            Cerrar sesion
          </button>
        </div>
      </aside>
    </>
  );
}

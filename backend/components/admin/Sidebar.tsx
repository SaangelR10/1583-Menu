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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-5 py-5">
        <p className="font-display text-lg font-semibold text-ink">Café 1583</p>
        <p className="text-xs text-ink-muted">Panel de administración</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
  );
}

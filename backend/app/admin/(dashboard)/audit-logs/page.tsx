"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/client/apiClient";
import { PageHeader, Spinner, EmptyState, Badge } from "@/components/admin/ui/Primitives";
import { Fab, FabGroup } from "@/components/admin/ui/Fab";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  admin: { email: string };
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { logs } = await apiFetch<{ logs: AuditLog[] }>("/api/v1/admin/audit-logs");
    setLogs(logs);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial async estandar
    load();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div>
      <PageHeader title="Actividad" description="Registro de auditoria de todas las acciones del panel." />

      <FabGroup onlyMobile={false}>
        <Fab label="Refrescar" variant="secondary" onClick={handleRefresh} loading={refreshing}>
          🔄
        </Fab>
      </FabGroup>

      {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {!logs ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-6 w-6 text-gold" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState title="Sin actividad registrada" />
      ) : (
        <>
          {/* Mobile: lista de tarjetas */}
          <div className="space-y-2 sm:hidden">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge>{log.action}</Badge>
                  <span className="text-xs text-ink-muted">
                    {new Date(log.createdAt).toLocaleString("es-CO")}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm text-ink">{log.admin.email}</p>
                <p className="text-xs text-ink-muted">
                  {log.entityType} · IP {log.ip ?? "—"}
                </p>
              </div>
            ))}
          </div>

          {/* Escritorio: tabla */}
          <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Accion</th>
                  <th className="px-4 py-3">Entidad</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-border bg-surface">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                      {new Date(log.createdAt).toLocaleString("es-CO")}
                    </td>
                    <td className="px-4 py-3 text-ink">{log.admin.email}</td>
                    <td className="px-4 py-3">
                      <Badge>{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{log.entityType}</td>
                    <td className="px-4 py-3 text-ink-muted">{log.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

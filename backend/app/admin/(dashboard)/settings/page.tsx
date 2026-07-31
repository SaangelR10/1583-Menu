"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/client/apiClient";
import { useAuth } from "@/components/admin/AuthProvider";
import { Button, Card, Input, FormField, PageHeader } from "@/components/admin/ui/Primitives";

export default function SettingsPage() {
  const { admin } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [enableCode, setEnableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [twoFactorMsg, setTwoFactorMsg] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMsg(null);
    setPasswordBusy(true);
    try {
      await apiFetch("/api/v1/admin/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMsg("Contrasena actualizada.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "No se pudo cambiar la contrasena.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function startTwoFactorSetup() {
    setTwoFactorError(null);
    try {
      const res = await apiFetch<{ secret: string; qrDataUrl: string }>("/api/v1/admin/auth/2fa/setup", {
        method: "POST",
      });
      setQrDataUrl(res.qrDataUrl);
      setSecret(res.secret);
    } catch (err) {
      setTwoFactorError(err instanceof ApiError ? err.message : "No se pudo iniciar la configuracion 2FA.");
    }
  }

  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault();
    setTwoFactorError(null);
    try {
      await apiFetch("/api/v1/admin/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code: enableCode }) });
      setTwoFactorEnabled(true);
      setTwoFactorMsg("2FA activado.");
      setQrDataUrl(null);
      setSecret(null);
      setEnableCode("");
    } catch (err) {
      setTwoFactorError(err instanceof ApiError ? err.message : "Codigo incorrecto.");
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setTwoFactorError(null);
    try {
      await apiFetch("/api/v1/admin/auth/2fa/disable", { method: "POST", body: JSON.stringify({ password: disablePassword }) });
      setTwoFactorEnabled(false);
      setTwoFactorMsg("2FA desactivado.");
      setDisablePassword("");
    } catch (err) {
      setTwoFactorError(err instanceof ApiError ? err.message : "No se pudo desactivar.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" description={`Sesion actual: ${admin?.email}`} />

      <Card className="max-w-lg">
        <p className="mb-4 font-medium text-ink">Cambiar contrasena</p>
        {passwordError && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{passwordError}</p>}
        {passwordMsg && <p className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{passwordMsg}</p>}
        <form className="space-y-4" onSubmit={handleChangePassword}>
          <FormField label="Contrasena actual">
            <Input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </FormField>
          <FormField label="Nueva contrasena" hint="Minimo 8 caracteres.">
            <Input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </FormField>
          <Button type="submit" disabled={passwordBusy}>
            {passwordBusy ? "Guardando..." : "Actualizar contrasena"}
          </Button>
        </form>
      </Card>

      <Card className="max-w-lg">
        <p className="mb-4 font-medium text-ink">Autenticacion en dos pasos (2FA)</p>
        {twoFactorError && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{twoFactorError}</p>}
        {twoFactorMsg && <p className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{twoFactorMsg}</p>}

        {!qrDataUrl && !twoFactorEnabled && (
          <Button type="button" variant="secondary" onClick={startTwoFactorSetup}>
            Activar 2FA
          </Button>
        )}

        {qrDataUrl && (
          <form className="space-y-4" onSubmit={confirmEnable}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Codigo QR 2FA" className="h-40 w-40 rounded-lg border border-border" />
            <p className="text-xs text-ink-muted">O ingresa manualmente: {secret}</p>
            <FormField label="Codigo de tu app de autenticacion">
              <Input inputMode="numeric" maxLength={6} required value={enableCode} onChange={(e) => setEnableCode(e.target.value)} />
            </FormField>
            <Button type="submit">Confirmar y activar</Button>
          </form>
        )}

        {twoFactorEnabled && (
          <form className="space-y-4" onSubmit={handleDisable}>
            <p className="text-sm text-ink-muted">2FA esta activo en esta cuenta.</p>
            <FormField label="Confirma tu contrasena para desactivarlo">
              <Input type="password" required value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} />
            </FormField>
            <Button type="submit" variant="danger">
              Desactivar 2FA
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

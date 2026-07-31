"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, ApiError } from "@/components/admin/AuthProvider";
import { Button, Input, FormField, Card } from "@/components/admin/ui/Primitives";

export default function LoginPage() {
  const router = useRouter();
  const { login, verifyTwoFactor } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await login(email, password);
      if (result.twoFactorRequired && result.challengeToken) {
        setChallengeToken(result.challengeToken);
      } else {
        router.push("/admin");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesion.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify2fa(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeToken) return;
    setError(null);
    setBusy(true);
    try {
      await verifyTwoFactor(challengeToken, code);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Codigo incorrecto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-ink">Café 1583 — Panel Admin</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {challengeToken ? "Ingresa el codigo de tu app de autenticacion." : "Inicia sesion para continuar."}
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        {!challengeToken ? (
          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <FormField label="Correo">
              <Input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>
            <FormField label="Contrasena">
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleVerify2fa}>
            <FormField label="Codigo de 6 digitos">
              <Input
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </FormField>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Verificando..." : "Verificar"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

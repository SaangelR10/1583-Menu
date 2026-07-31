"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/client/apiClient";
import { CloudinaryUploader } from "@/components/admin/CloudinaryUploader";
import { Button, Card, Input, Textarea, FormField, PageHeader, Spinner } from "@/components/admin/ui/Primitives";

const DAYS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

type Banner = { imageUrl: string; imagePublicId?: string };

type StoreConfig = {
  whatsappNumber: string;
  instagramUrl: string;
  address: string;
  dailyMessage: string;
  aboutText: string;
  hours: Record<string, string> | null;
  banners: Banner[] | null;
};

export default function StoreConfigPage() {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiFetch<{ config: StoreConfig }>("/api/v1/admin/store-config").then(({ config }) => setConfig(config));
  }, []);

  function updateField<K extends keyof StoreConfig>(key: K, value: StoreConfig[K]) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateHour(day: string, value: string) {
    setConfig((prev) => (prev ? { ...prev, hours: { ...(prev.hours ?? {}), [day]: value } } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiFetch("/api/v1/admin/store-config", { method: "PATCH", body: JSON.stringify(config) });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-6 w-6 text-gold" />
      </div>
    );
  }

  const banners = config.banners ?? [];

  return (
    <div>
      <PageHeader title="Info. de la tienda" description="Horarios, redes sociales, mensaje del dia y banners." />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {success && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">Guardado.</p>}

        <Card className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Numero de WhatsApp">
            <Input
              value={config.whatsappNumber}
              onChange={(e) => updateField("whatsappNumber", e.target.value)}
              placeholder="+573181454142"
            />
          </FormField>
          <FormField label="Instagram (URL)">
            <Input value={config.instagramUrl} onChange={(e) => updateField("instagramUrl", e.target.value)} />
          </FormField>
          <FormField label="Direccion">
            <Input value={config.address} onChange={(e) => updateField("address", e.target.value)} />
          </FormField>
          <FormField label="Mensaje del dia">
            <Input value={config.dailyMessage} onChange={(e) => updateField("dailyMessage", e.target.value)} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Sobre nosotros (¿por que somos 1583?)">
              <Textarea rows={4} value={config.aboutText} onChange={(e) => updateField("aboutText", e.target.value)} />
            </FormField>
          </div>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-medium text-ink">Horarios</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DAYS.map((day) => (
              <FormField key={day} label={day}>
                <Input
                  placeholder="8:00am - 8:00pm"
                  value={config.hours?.[day] ?? ""}
                  onChange={(e) => updateHour(day, e.target.value)}
                />
              </FormField>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Banners</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => updateField("banners", [...banners, { imageUrl: "" }])}
            >
              + Agregar banner
            </Button>
          </div>
          <div className="flex flex-wrap gap-4">
            {banners.map((banner, index) => (
              <div key={index} className="relative">
                <CloudinaryUploader
                  scope="tienda"
                  aspect={16 / 9}
                  value={{ imageUrl: banner.imageUrl, imagePublicId: banner.imagePublicId ?? null }}
                  onChange={(next) => {
                    const copy = [...banners];
                    copy[index] = { imageUrl: next.imageUrl, imagePublicId: next.imagePublicId ?? undefined };
                    updateField("banners", copy);
                  }}
                />
                <button
                  type="button"
                  onClick={() => updateField("banners", banners.filter((_, i) => i !== index))}
                  className="mt-1 text-xs text-danger hover:underline"
                >
                  Quitar banner
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { apiFetch } from "@/lib/client/apiClient";
import { getCroppedImageBlob } from "@/lib/client/cropImage";
import { Button, Spinner } from "@/components/admin/ui/Primitives";

type ImageValue = { imageUrl: string; imagePublicId: string | null };

type SignResponse = { timestamp: number; signature: string; cloudName: string; apiKey: string; folder: string };

export function CloudinaryUploader({
  value,
  onChange,
  scope = "producto",
  aspect = 4 / 3,
}: {
  value: ImageValue;
  onChange: (next: ImageValue) => void;
  scope?: "producto" | "tienda";
  aspect?: number;
}) {
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen valido.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setRawImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => setCroppedArea(areaPixels), []);

  async function confirmCrop() {
    if (!rawImage || !croppedArea) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await getCroppedImageBlob(rawImage, croppedArea);
      const sign = await apiFetch<SignResponse>("/api/v1/admin/uploads/sign", {
        method: "POST",
        body: JSON.stringify({ scope }),
      });

      const formData = new FormData();
      formData.append("file", blob);
      formData.append("api_key", sign.apiKey);
      formData.append("timestamp", String(sign.timestamp));
      formData.append("signature", sign.signature);
      formData.append("folder", sign.folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData?.error?.message ?? "Fallo la subida a Cloudinary.");

      const previousPublicId = value.imagePublicId;
      onChange({ imageUrl: uploadData.secure_url, imagePublicId: uploadData.public_id });
      setRawImage(null);

      if (previousPublicId) {
        apiFetch("/api/v1/admin/uploads/destroy", {
          method: "POST",
          body: JSON.stringify({ publicId: previousPublicId }),
        }).catch(() => null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage() {
    if (value.imagePublicId) {
      apiFetch("/api/v1/admin/uploads/destroy", {
        method: "POST",
        body: JSON.stringify({ publicId: value.imagePublicId }),
      }).catch(() => null);
    }
    onChange({ imageUrl: "", imagePublicId: null });
  }

  if (rawImage) {
    return (
      <div className="space-y-3">
        <div className="relative h-72 w-full overflow-hidden rounded-lg border border-border bg-black/80">
          <Cropper
            image={rawImage}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" onClick={confirmCrop} disabled={uploading}>
            {uploading ? <Spinner className="h-4 w-4" /> : "Recortar y subir"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setRawImage(null)} disabled={uploading}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {value.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value.imageUrl} alt="" className="h-40 w-56 rounded-lg border border-border object-cover" />
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          className="flex h-40 w-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center text-sm text-ink-muted hover:border-gold hover:text-gold"
        >
          <p>Arrastra una imagen aqui</p>
          <p className="text-xs">o haz clic para elegir</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => cameraInputRef.current?.click()}>
          📷 Tomar foto
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          {value.imageUrl ? "Cambiar archivo" : "Elegir archivo"}
        </Button>
        {value.imageUrl && (
          <Button type="button" variant="danger" size="sm" onClick={removeImage}>
            Eliminar imagen
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

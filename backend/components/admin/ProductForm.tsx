"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/client/apiClient";
import { CloudinaryUploader } from "@/components/admin/CloudinaryUploader";
import { Button, Card, Input, Textarea, Select, Switch, FormField } from "@/components/admin/ui/Primitives";

type Category = { id: string; name: string };

type Product = {
  id: string;
  categoryId: string;
  name: string;
  nameEn: string;
  description: string;
  additions: string;
  price: number | null;
  imageUrl: string;
  imagePublicId: string | null;
  inStock: boolean;
};

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [nameEn, setNameEn] = useState(product?.nameEn ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [additions, setAdditions] = useState(product?.additions ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [inStock, setInStock] = useState(product?.inStock ?? true);
  const [image, setImage] = useState({
    imageUrl: product?.imageUrl ?? "",
    imagePublicId: product?.imagePublicId ?? null,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ categories: Category[] }>("/api/v1/admin/categories").then(({ categories }) => {
      setCategories(categories);
      if (!categoryId && categories[0]) setCategoryId(categories[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const payload = {
      categoryId,
      name,
      nameEn,
      description,
      additions,
      price: price.trim() === "" ? null : Number(price),
      inStock,
      imageUrl: image.imageUrl,
      imagePublicId: image.imagePublicId,
    };
    try {
      if (product) {
        await apiFetch(`/api/v1/admin/products/${product.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/v1/admin/products", { method: "POST", body: JSON.stringify(payload) });
      }
      router.push("/admin/productos");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el producto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <Card className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Categoria">
          <Select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Precio (COP)">
          <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
        </FormField>
        <FormField label="Nombre (español)">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Nombre (ingles)">
          <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        </FormField>
        <FormField label="Descripcion">
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <FormField label="Adiciones / extras">
          <Textarea rows={3} value={additions} onChange={(e) => setAdditions(e.target.value)} />
        </FormField>
        <div className="sm:col-span-2">
          <div className="flex items-center gap-3">
            <Switch checked={inStock} onChange={setInStock} label="En stock" />
            <span className="text-sm text-ink">{inStock ? "En stock" : "Agotado"}</span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {inStock
              ? "Visible en el menú público."
              : "Agotado: este producto se oculta del menú público hasta que lo vuelvas a activar."}
          </p>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-medium text-ink">Imagen del producto</p>
        <CloudinaryUploader value={image} onChange={setImage} scope="producto" />
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando..." : "Guardar producto"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/productos")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

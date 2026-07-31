"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/client/apiClient";
import { Button, Badge, Switch, Input, Select, EmptyState, Spinner, PageHeader } from "@/components/admin/ui/Primitives";

type Product = {
  id: string;
  name: string;
  price: number | null;
  imageUrl: string;
  inStock: boolean;
  category: { id: string; name: string };
};
type Category = { id: string; name: string };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [{ products }, { categories }] = await Promise.all([
      apiFetch<{ products: Product[] }>("/api/v1/admin/products"),
      apiFetch<{ categories: Category[] }>("/api/v1/admin/categories"),
    ]);
    setProducts(products);
    setCategories(categories);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial async estandar
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesCategory = !categoryFilter || p.category.id === categoryFilter;
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, categoryFilter, search]);

  async function toggleStock(id: string, value: boolean) {
    setProducts((prev) => prev?.map((p) => (p.id === id ? { ...p, inStock: value } : p)) ?? prev);
    try {
      await apiFetch(`/api/v1/admin/products/${id}`, { method: "PATCH", body: JSON.stringify({ inStock: value }) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar.");
      load();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este producto? Tambien se borra su imagen en Cloudinary.")) return;
    try {
      await apiFetch(`/api/v1/admin/products/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Gestiona el catalogo completo."
        actions={<Link href="/admin/productos/nuevo"><Button>+ Nuevo producto</Button></Link>}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:max-w-xs"
        >
          <option value="">Todas las categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {!products ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-6 w-6 text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Sin productos" description="Ajusta los filtros o crea un nuevo producto." />
      ) : (
        <>
          {/* Mobile: lista de tarjetas */}
          <div className="space-y-3 sm:hidden">
            {filtered.map((product) => (
              <div key={product.id} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-start gap-3">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-md bg-surface-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{product.name}</p>
                    <p className="truncate text-xs text-ink-muted">{product.category.name}</p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {product.price != null ? `$ ${product.price.toLocaleString("es-CO")}` : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2" title="Agotado = se oculta del menú público">
                    <Switch checked={product.inStock} onChange={(v) => toggleStock(product.id, v)} />
                    {!product.inStock && <Badge tone="warning">Agotado</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/productos/${product.id}/editar`}>
                      <Button variant="secondary" size="sm">Editar</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Escritorio: tabla */}
          <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-t border-border bg-surface">
                    <td className="flex items-center gap-3 px-4 py-3">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt="" className="h-10 w-10 rounded-md object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-surface-muted" />
                      )}
                      <span className="font-medium text-ink">{product.name}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{product.category.name}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {product.price != null ? `$ ${product.price.toLocaleString("es-CO")}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center gap-2"
                        title="Agotado = se oculta del menú público"
                      >
                        <Switch checked={product.inStock} onChange={(v) => toggleStock(product.id, v)} />
                        {!product.inStock && <Badge tone="warning">Agotado (oculto)</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/productos/${product.id}/editar`}>
                          <Button variant="secondary" size="sm">Editar</Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </td>
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

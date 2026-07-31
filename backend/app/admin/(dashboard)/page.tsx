"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/client/apiClient";
import { Card, PageHeader, Spinner } from "@/components/admin/ui/Primitives";
import { Fab, FabGroup } from "@/components/admin/ui/Fab";

type Category = { id: string; name: string; isActive: boolean; _count: { products: number } };
type Product = { id: string; inStock: boolean };

export default function OverviewPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [{ categories }, { products }] = await Promise.all([
      apiFetch<{ categories: Category[] }>("/api/v1/admin/categories"),
      apiFetch<{ products: Product[] }>("/api/v1/admin/products"),
    ]);
    setCategories(categories);
    setProducts(products);
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

  if (!categories || !products) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-6 w-6 text-gold" />
      </div>
    );
  }

  const activeCategories = categories.filter((c) => c.isActive).length;
  const outOfStock = products.filter((p) => !p.inStock).length;

  const stats = [
    { label: "Categorias activas", value: activeCategories, of: categories.length },
    { label: "Productos totales", value: products.length },
    { label: "Productos agotados", value: outOfStock },
  ];

  return (
    <div>
      <PageHeader title="Resumen" description="Estado general del menú de Café 1583." />

      <FabGroup onlyMobile={false}>
        <Fab label="Refrescar" variant="secondary" onClick={handleRefresh} loading={refreshing}>
          🔄
        </Fab>
      </FabGroup>

      {error && <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-ink-muted">{stat.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-ink">
              {stat.value}
              {stat.of !== undefined && <span className="text-base text-ink-muted"> / {stat.of}</span>}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/admin/categorias">
          <Card className="transition-shadow hover:shadow-md">
            <p className="font-medium text-ink">Gestionar categorias</p>
            <p className="mt-1 text-sm text-ink-muted">Crear, reordenar y activar/desactivar.</p>
          </Card>
        </Link>
        <Link href="/admin/productos/nuevo">
          <Card className="transition-shadow hover:shadow-md">
            <p className="font-medium text-ink">Nuevo producto</p>
            <p className="mt-1 text-sm text-ink-muted">Agregar un producto con imagen.</p>
          </Card>
        </Link>
        <Link href="/admin/tienda">
          <Card className="transition-shadow hover:shadow-md">
            <p className="font-medium text-ink">Info. de la tienda</p>
            <p className="mt-1 text-sm text-ink-muted">Horarios, redes y mensaje del dia.</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client/apiClient";
import { Card, PageHeader, Spinner } from "@/components/admin/ui/Primitives";

type Category = { id: string; name: string; isActive: boolean; _count: { products: number } };
type Product = { id: string; inStock: boolean };

export default function OverviewPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    (async () => {
      const [{ categories }, { products }] = await Promise.all([
        apiFetch<{ categories: Category[] }>("/api/v1/admin/categories"),
        apiFetch<{ products: Product[] }>("/api/v1/admin/products"),
      ]);
      setCategories(categories);
      setProducts(products);
    })();
  }, []);

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

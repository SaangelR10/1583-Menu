"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/client/apiClient";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader, Spinner } from "@/components/admin/ui/Primitives";

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

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    apiFetch<{ products: Product[] }>("/api/v1/admin/products").then(({ products }) => {
      setProduct(products.find((p) => p.id === params.id) ?? null);
    });
  }, [params.id]);

  if (!product) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-6 w-6 text-gold" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Editar: ${product.name}`} />
      <ProductForm product={product} />
    </div>
  );
}

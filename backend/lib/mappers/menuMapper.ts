import type { Category, Product } from "@/app/generated/prisma/client";

export function formatCOP(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export type CategoryWithProducts = Category & { products: Product[] };

export type PublicMenuItem = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  additions: string;
  price: number | null;
  priceLabel: string;
  image: string;
};

export type PublicMenuCategory = {
  name: string;
  nameEn: string;
  items: PublicMenuItem[];
};

export type PublicMenuPayload = {
  generatedAt: string;
  source: string;
  splashEnabled: boolean;
  categories: PublicMenuCategory[];
};

/**
 * Reproduce EXACTAMENTE el shape que hoy genera scripts/build-menu-data.js, para que el
 * frontend publico (index.html) no note ninguna diferencia al consumir esta API en vez del
 * JSON estatico.
 */
export function buildMenuPayload(categories: CategoryWithProducts[]): PublicMenuPayload {
  const activeCategories = categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const payloadCategories: PublicMenuCategory[] = activeCategories.map((category) => ({
    name: category.name,
    nameEn: category.nameEn,
    items: [...category.products]
      .filter((product) => product.inStock)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((product) => ({
        id: product.slug,
        name: product.name,
        nameEn: product.nameEn,
        description: product.description,
        additions: product.additions,
        price: product.price,
        priceLabel: formatCOP(product.price),
        image: product.imageUrl,
      })),
  }));

  const combos = activeCategories.find((c) => c.name === "Combos");
  const splashEnabled = combos
    ? combos.products.some((p) => p.inStock && p.imageUrl.trim() !== "")
    : false;

  return {
    generatedAt: new Date().toISOString(),
    source: "database",
    splashEnabled,
    categories: payloadCategories,
  };
}

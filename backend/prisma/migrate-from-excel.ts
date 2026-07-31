/**
 * Migracion unica: Cargue productos/Menu Web.xlsx -> base de datos.
 * Corre con:  npm run migrate:excel   (usa el DATABASE_URL de tu .env)
 * Reutiliza el mismo parsing que scripts/build-menu-data.js (raiz del repo) para no perder
 * ningun dato existente, y sube a Cloudinary las imagenes que hoy son archivos locales.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { v2 as cloudinary } from "cloudinary";

const REPO_ROOT = path.join(__dirname, "..", "..");
const EXCEL_PATH = path.join(REPO_ROOT, "Cargue productos", "Menu Web.xlsx");
const IMAGES_ROOT = REPO_ROOT;
const CLOUDINARY_FOLDER = "1583-menu/productos";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parsePrice(value: unknown): number | null {
  if (typeof value === "number") return Math.round(value);
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const number = parseFloat(cleaned);
  return Number.isFinite(number) ? Math.round(number) : null;
}

const CATEGORY_FALLBACK: Record<string, string> = {
  "Panadería": "Bakery",
  Snack: "Snacks",
  Tortas: "Cakes",
  "Bebidas Calientes": "Hot Drinks",
  "Bebidas Frías": "Cold Drinks",
  "Sodas Italianas": "Italian Sodas",
  Vinos: "Wines",
  "Tabla de Quesos": "Charcuterie Board",
  "By 1583": "By 1583",
  Adiciones: "Extras",
  Combos: "Combos",
  Galletería: "Cookies & Pastries",
  Mousse: "Mousse",
};

type Row = Record<string, unknown>;

type ParsedItem = {
  categoryName: string;
  name: string;
  nameEn: string;
  description: string;
  additions: string;
  imageRaw: string;
  price: number | null;
};

async function resolveImage(imageRaw: string): Promise<{ url: string; publicId: string | null }> {
  const trimmed = imageRaw.trim();
  if (!trimmed) return { url: "", publicId: null };
  if (/^https?:\/\//i.test(trimmed)) return { url: trimmed, publicId: null };

  const localPath = path.join(IMAGES_ROOT, trimmed);
  if (!fs.existsSync(localPath)) {
    console.warn(`  ! Imagen no encontrada en disco, se deja vacia: ${trimmed}`);
    return { url: "", publicId: null };
  }

  try {
    const result = await cloudinary.uploader.upload(localPath, { folder: CLOUDINARY_FOLDER });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    console.warn(`  ! Fallo la subida a Cloudinary de "${trimmed}": ${(err as Error).message}`);
    return { url: "", publicId: null };
  }
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`No se encontro el Excel en: ${EXCEL_PATH}`);
  }

  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });

  const categoryOrder: string[] = [];
  const categoryEnMap = new Map<string, string>();
  const itemsByCategory = new Map<string, ParsedItem[]>();

  for (const row of rows) {
    const category = String(row["Categoría"] || row["Categoria"] || "Sin categoría").trim();
    const name = String(row["Producto"] || row["Nombre"] || "Producto sin nombre").trim();
    const description = String(row["Descripcion"] || row["Descripción"] || row["Description"] || "").trim();
    const additions = String(row["Adiciones"] || row["Extras"] || "").trim();
    const imageRaw = String(
      row["Imagen"] || row["Imagenes"] || row["Imagen URL"] || row["Imagenes URL"] || ""
    ).trim();
    const nameEnManual = String(row["Nombre Inglés"] || row["Nombre Ingles"] || row["Name English"] || row["EN"] || "").trim();
    const categoryEnManual = String(row["Categoría Inglés"] || row["Categoria Inglés"] || row["Category English"] || "").trim();
    const price = parsePrice(row["Precio"]);

    if (categoryEnManual && !categoryEnMap.has(category)) categoryEnMap.set(category, categoryEnManual);
    if (!itemsByCategory.has(category)) {
      itemsByCategory.set(category, []);
      categoryOrder.push(category);
    }
    itemsByCategory.get(category)!.push({
      categoryName: category,
      name,
      nameEn: nameEnManual,
      description,
      additions,
      imageRaw,
      price,
    });
  }

  console.log(`Encontradas ${categoryOrder.length} categorias y ${rows.length} productos en el Excel.\n`);

  const usedSlugs = new Set<string>();

  for (let categoryIndex = 0; categoryIndex < categoryOrder.length; categoryIndex++) {
    const categoryName = categoryOrder[categoryIndex];
    const items = itemsByCategory.get(categoryName)!;
    const nameEn = categoryEnMap.get(categoryName) || CATEGORY_FALLBACK[categoryName] || "";

    const category = await prisma.category.create({
      data: { name: categoryName, nameEn, sortOrder: categoryIndex, isActive: true },
    });
    console.log(`Categoria creada: ${categoryName} (${items.length} productos)`);

    for (let productIndex = 0; productIndex < items.length; productIndex++) {
      const item = items[productIndex];
      const baseSlug = slugify(`${item.categoryName}-${item.name}`) || "producto";
      let slug = baseSlug;
      let counter = 1;
      while (usedSlugs.has(slug)) {
        counter += 1;
        slug = `${baseSlug}-${counter}`;
      }
      usedSlugs.add(slug);

      const { url, publicId } = await resolveImage(item.imageRaw);

      await prisma.product.create({
        data: {
          slug,
          categoryId: category.id,
          name: item.name,
          nameEn: item.nameEn,
          description: item.description,
          additions: item.additions,
          price: item.price,
          imageUrl: url,
          imagePublicId: publicId,
          inStock: true,
          sortOrder: productIndex,
        },
      });
      console.log(`  - ${item.name}${url ? " (imagen migrada)" : ""}`);
    }
  }

  console.log("\nMigracion completa.");
}

main()
  .catch((error) => {
    console.error("Error migrando desde Excel:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

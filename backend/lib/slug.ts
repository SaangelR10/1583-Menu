export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Genera un slug único dentro del set `existing`, añadiendo un sufijo numérico en colisiones. */
export function uniqueSlug(base: string, existing: Set<string>): string {
  const cleaned = base || "producto";
  let candidate = cleaned;
  let counter = 1;
  while (existing.has(candidate)) {
    counter += 1;
    candidate = `${cleaned}-${counter}`;
  }
  existing.add(candidate);
  return candidate;
}

/**
 * Product variants and stock (Admin → Add Product → Variants & Stock).
 *
 * A product can have any number of variant groups ("Color", "Size", "Options"…),
 * each with options. Every option can have its own image and stock count.
 *
 * Stock is optional everywhere: `null` means "not tracked" (always available).
 * - products.stock          : stock for the whole product
 * - variants[].options.stock: stock for that one option
 *
 * Option stock is tracked per option, not per combination: buying a
 * "Black / XL" takes one from Black and one from XL.
 */

export interface VariantOption {
  name: string;
  /** Optional image shown when this option is selected. */
  image: string;
  /** null = not tracked (always available). */
  stock: number | null;
}

export interface VariantGroup {
  name: string;
  options: VariantOption[];
}

/** Chosen option name per group name, e.g. { Color: "Black", Size: "XL" }. */
export type VariantSelection = Record<string, string>;

const MAX_GROUPS = 5;
const MAX_OPTIONS = 30;
const MAX_NAME = 60;

/** Blank / invalid → null (not tracked). Otherwise a whole number ≥ 0. */
export function normalizeStock(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export const isColorGroup = (name: string) => /^colou?rs?$/i.test(name.trim());

/**
 * Cleans the `variants` column. Products saved before variants existed only
 * have a list of colors; those become a single "Color" group.
 */
export function normalizeVariants(raw: unknown, legacyColors?: string[] | null): VariantGroup[] {
  const groups: VariantGroup[] = [];
  if (Array.isArray(raw)) {
    for (const g of raw.slice(0, MAX_GROUPS)) {
      const name = String(g?.name ?? "").trim().slice(0, MAX_NAME);
      if (!name || groups.some((x) => x.name.toLowerCase() === name.toLowerCase())) continue;
      const options: VariantOption[] = [];
      for (const o of Array.isArray(g?.options) ? g.options.slice(0, MAX_OPTIONS) : []) {
        const optName = String(o?.name ?? "").trim().slice(0, MAX_NAME);
        if (!optName || options.some((x) => x.name === optName)) continue;
        options.push({
          name: optName,
          image: typeof o?.image === "string" ? o.image.trim() : "",
          stock: normalizeStock(o?.stock),
        });
      }
      if (options.length > 0) groups.push({ name, options });
    }
  }
  if (groups.length === 0 && Array.isArray(legacyColors) && legacyColors.length > 0) {
    const options = legacyColors
      .map((c) => String(c).trim())
      .filter((c, i, all) => c && all.indexOf(c) === i)
      .map((c) => ({ name: c, image: "", stock: null }));
    if (options.length > 0) groups.push({ name: "Color", options });
  }
  return groups;
}

/** Option names of the "Color" group (kept in products.colors for the colour dots). */
export function colorNamesFromVariants(groups: VariantGroup[]): string[] {
  return groups.find((g) => isColorGroup(g.name))?.options.map((o) => o.name) ?? [];
}

export const isOptionInStock = (o: VariantOption) => o.stock === null || o.stock > 0;

/** True when the product can't be bought at all. */
export function isSoldOut(stock: number | null | undefined, groups: VariantGroup[]): boolean {
  if (stock !== null && stock !== undefined && stock <= 0) return true;
  return groups.some((g) => !g.options.some(isOptionInStock));
}

/** First in-stock option of every group. */
export function defaultSelection(groups: VariantGroup[]): VariantSelection {
  const sel: VariantSelection = {};
  for (const g of groups) {
    sel[g.name] = (g.options.find(isOptionInStock) ?? g.options[0]).name;
  }
  return sel;
}

/** True when the shopper has a real choice to make (so quick-add should open the product page). */
export function needsChoice(groups: VariantGroup[]): boolean {
  return groups.some((g) => g.options.filter(isOptionInStock).length > 1);
}

/** "Black / XL" — stored on cart lines and orders as the variant label. */
export function selectionLabel(groups: VariantGroup[], sel: VariantSelection): string {
  return groups.map((g) => sel[g.name]).filter(Boolean).join(" / ");
}

/** How many can be bought with this selection; null = unlimited. */
export function availableQuantity(
  stock: number | null | undefined,
  groups: VariantGroup[],
  sel: VariantSelection
): number | null {
  let max: number | null = stock ?? null;
  for (const g of groups) {
    const opt = g.options.find((o) => o.name === sel[g.name]);
    if (opt && opt.stock !== null) max = max === null ? opt.stock : Math.min(max, opt.stock);
  }
  return max;
}

/**
 * Server-side: turns what the cart sent into a valid selection. Carts saved
 * before variants existed only carry a label (the old colour), which is
 * matched against single-group products.
 */
export function resolveSelection(
  groups: VariantGroup[],
  requested: unknown,
  legacyLabel: string
): VariantSelection | null {
  const req = requested && typeof requested === "object" ? (requested as Record<string, unknown>) : {};
  const sel: VariantSelection = {};
  for (const g of groups) {
    let choice = typeof req[g.name] === "string" ? (req[g.name] as string) : "";
    if (!choice && groups.length === 1) choice = legacyLabel;
    if (!choice && g.options.length === 1) choice = g.options[0].name;
    if (!g.options.some((o) => o.name === choice)) return null;
    sel[g.name] = choice;
  }
  return sel;
}

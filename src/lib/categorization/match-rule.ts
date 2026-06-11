export interface CategorizationRule {
  id: string;
  pattern: string;
  category_id: string;
  subcategory_id: string | null;
  priority: number;
}

export function matchCategoryFromRules(
  text: string,
  rules: CategorizationRule[]
): { category_id: string; subcategory_id: string | null } | null {
  if (!text.trim() || !rules.length) return null;

  const lower = text.toLowerCase();
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    const pattern = rule.pattern.toLowerCase();
    if (lower.includes(pattern)) {
      return { category_id: rule.category_id, subcategory_id: rule.subcategory_id };
    }
  }

  return null;
}

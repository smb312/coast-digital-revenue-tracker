import type { ItemCategory, ItemKind } from "@/lib/database.types";

// Human labels and display ordering for kinds and categories.

export const KIND_LABEL: Record<ItemKind, string> = {
  income: "Income",
  expense: "Expenses",
};

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  client_revenue: "Client Revenue",
  referral_revenue: "Referral Revenue",
  other_income: "Other Income",
  payroll: "Payroll",
  operating_expense: "Operating Expenses",
  other_expense: "Other Expenses",
};

// Which categories belong to which kind, in display order. referral_revenue
// sits right beside client_revenue in the income section.
export const CATEGORIES_BY_KIND: Record<ItemKind, ItemCategory[]> = {
  income: ["client_revenue", "referral_revenue", "other_income"],
  expense: ["payroll", "operating_expense", "other_expense"],
};

export const KIND_ORDER: ItemKind[] = ["income", "expense"];

export const ALL_CATEGORIES: ItemCategory[] = [
  ...CATEGORIES_BY_KIND.income,
  ...CATEGORIES_BY_KIND.expense,
];

export function kindForCategory(category: ItemCategory): ItemKind {
  return CATEGORIES_BY_KIND.income.includes(category) ? "income" : "expense";
}

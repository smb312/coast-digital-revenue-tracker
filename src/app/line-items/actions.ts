"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthInputToDate } from "@/lib/format";
import { kindForCategory } from "@/lib/categories";
import type {
  ItemCategory,
  ItemFrequency,
  LineItemInput,
} from "@/lib/database.types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const CATEGORIES: ItemCategory[] = [
  "client_revenue",
  "referral_revenue",
  "other_income",
  "payroll",
  "operating_expense",
  "other_expense",
];

// Parse + validate the shared line-item form fields into a DB payload.
// NOTE: never includes user_id — the DB defaults it to auth.uid().
function parseForm(formData: FormData):
  | { ok: true; data: LineItemInput }
  | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as ItemCategory;
  const frequency = String(formData.get("frequency") ?? "") as ItemFrequency;
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const startMonth = String(formData.get("start_month") ?? "").trim();
  const endMonth = String(formData.get("end_month") ?? "").trim();
  const counterparty = String(formData.get("counterparty") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) return { ok: false, error: "Name is required." };
  if (!CATEGORIES.includes(category))
    return { ok: false, error: "Pick a valid category." };
  if (frequency !== "monthly" && frequency !== "one_time")
    return { ok: false, error: "Pick a valid frequency." };

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount))
    return { ok: false, error: "Amount must be a number." };

  if (!/^\d{4}-\d{2}$/.test(startMonth))
    return { ok: false, error: "Start month is required." };

  if (endMonth && !/^\d{4}-\d{2}$/.test(endMonth))
    return { ok: false, error: "End month is invalid." };

  // one_time items have a single month; ignore any end month.
  const normalizedEnd =
    frequency === "one_time" || !endMonth ? null : monthInputToDate(endMonth);

  if (normalizedEnd && normalizedEnd < monthInputToDate(startMonth))
    return { ok: false, error: "End month can't be before the start month." };

  return {
    ok: true,
    data: {
      name,
      kind: kindForCategory(category),
      category,
      amount,
      frequency,
      start_month: monthInputToDate(startMonth),
      end_month: normalizedEnd,
      counterparty: counterparty || null,
      notes: notes || null,
    },
  };
}

function revalidate() {
  revalidatePath("/line-items");
  revalidatePath("/");
}

export async function createLineItem(
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase.from("line_items").insert(parsed.data);
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

export async function updateLineItem(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  // RLS scopes this to the owner; no need to filter on user_id.
  const { error } = await supabase
    .from("line_items")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

// "Stop an item" = set its end_month (last active month). Item stops the
// month after. Pass the yyyy-mm to stop at.
export async function stopLineItem(
  id: string,
  endMonth: string
): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}$/.test(endMonth))
    return { ok: false, error: "Invalid end month." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("line_items")
    .update({ end_month: monthInputToDate(endMonth) })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

export async function deleteLineItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("line_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

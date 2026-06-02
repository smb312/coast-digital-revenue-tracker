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
  revalidatePath("/referral-income");
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

// --- Monthly overrides -----------------------------------------------------
// Set a custom amount for ONE month of a line item (raise, bonus, extra
// payroll run, underpayment). Upserts on (line_item_id, month) without relying
// on a named constraint. Inserts never send user_id (DB defaults auth.uid()).
export async function setOverride(
  lineItemId: string,
  month: string, // yyyy-mm
  amount: number
): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}$/.test(month))
    return { ok: false, error: "Invalid month." };
  if (!Number.isFinite(amount))
    return { ok: false, error: "Amount must be a number." };

  const supabase = await createClient();
  const monthDate = monthInputToDate(month);

  const { data: existing, error: selErr } = await supabase
    .from("monthly_overrides")
    .select("id")
    .eq("line_item_id", lineItemId)
    .eq("month", monthDate)
    .maybeSingle();
  if (selErr) return { ok: false, error: selErr.message };

  if (existing) {
    const { error } = await supabase
      .from("monthly_overrides")
      .update({ amount })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("monthly_overrides")
      .insert({ line_item_id: lineItemId, month: monthDate, amount });
    if (error) return { ok: false, error: error.message };
  }

  revalidate();
  return { ok: true };
}

// Remove a month's override, reverting that month to the line item's amount.
export async function clearOverride(
  lineItemId: string,
  month: string // yyyy-mm
): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}$/.test(month))
    return { ok: false, error: "Invalid month." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("monthly_overrides")
    .delete()
    .eq("line_item_id", lineItemId)
    .eq("month", monthInputToDate(month));
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

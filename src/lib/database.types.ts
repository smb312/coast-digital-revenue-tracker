// Hand-maintained types describing the existing Supabase schema.
// Mirrors schema.sql. The DB is the source of truth; keep these in sync.

export type ItemKind = "income" | "expense";

export type ItemCategory =
  | "client_revenue"
  | "referral_revenue"
  | "other_income"
  | "payroll"
  | "operating_expense"
  | "other_expense";

export type ItemFrequency = "monthly" | "one_time";

export interface LineItem {
  id: string;
  user_id: string;
  name: string;
  kind: ItemKind;
  category: ItemCategory;
  amount: number;
  frequency: ItemFrequency;
  start_month: string; // ISO date (yyyy-mm-dd)
  end_month: string | null;
  counterparty: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Fields a user supplies when creating/editing. Never includes user_id —
// the DB defaults it to auth.uid().
export type LineItemInput = {
  name: string;
  kind: ItemKind;
  category: ItemCategory;
  amount: number;
  frequency: ItemFrequency;
  start_month: string;
  end_month: string | null;
  counterparty: string | null;
  notes: string | null;
};

export interface MonthlyOverride {
  id: string;
  user_id: string;
  line_item_id: string;
  month: string; // ISO date, first of month
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MonthlyOverrideInput = {
  line_item_id: string;
  month: string;
  amount: number;
  notes: string | null;
};

// View rows ---------------------------------------------------------------
export interface MonthlyLedgerRow {
  month: string;
  line_item_id: string;
  name: string;
  kind: ItemKind;
  category: ItemCategory;
  counterparty: string | null;
  amount: number;
}

export interface MonthlySummaryRow {
  month: string;
  income: number;
  expenses: number;
  net_profit: number;
}

// Minimal Database shape for the typed Supabase client.
export interface Database {
  public: {
    Tables: {
      line_items: {
        Row: LineItem;
        Insert: LineItemInput;
        Update: Partial<LineItemInput>;
      };
      monthly_overrides: {
        Row: MonthlyOverride;
        Insert: MonthlyOverrideInput;
        Update: Partial<MonthlyOverrideInput>;
      };
    };
    Views: {
      monthly_ledger: { Row: MonthlyLedgerRow };
      monthly_summary: { Row: MonthlySummaryRow };
    };
  };
}

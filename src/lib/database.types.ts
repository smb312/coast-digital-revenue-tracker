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

// NOTE: these Row shapes are `type` aliases (not interfaces) on purpose —
// object-literal type aliases get an implicit index signature, so they satisfy
// supabase-js's `Record<string, unknown>` schema constraint. Interfaces do not,
// which would make every query collapse to `never`.
export type LineItem = {
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

export type MonthlyOverride = {
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
export type MonthlyLedgerRow = {
  month: string;
  line_item_id: string;
  name: string;
  kind: ItemKind;
  category: ItemCategory;
  counterparty: string | null;
  amount: number;
}

export type MonthlySummaryRow = {
  month: string;
  income: number;
  expenses: number;
  net_profit: number;
}

// Database shape for the typed Supabase client. The extra Relationships /
// Functions / Enums / CompositeTypes keys are required for supabase-js's type
// inference to resolve table types (otherwise queries degrade to `never`).
export type Database = {
  public: {
    Tables: {
      line_items: {
        Row: LineItem;
        Insert: LineItemInput;
        Update: Partial<LineItemInput>;
        Relationships: [];
      };
      monthly_overrides: {
        Row: MonthlyOverride;
        Insert: MonthlyOverrideInput;
        Update: Partial<MonthlyOverrideInput>;
        Relationships: [];
      };
    };
    Views: {
      monthly_ledger: { Row: MonthlyLedgerRow; Relationships: [] };
      monthly_summary: { Row: MonthlySummaryRow; Relationships: [] };
    };
    Functions: Record<string, never>;
    Enums: {
      item_kind: ItemKind;
      item_category: ItemCategory;
      item_frequency: ItemFrequency;
    };
    CompositeTypes: Record<string, never>;
  };
}

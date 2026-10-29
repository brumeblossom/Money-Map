export interface WeeklyMetric {
  week_start: string; // YYYY-MM-DD
  count: number;
}

export interface AdminAnalytics {
  total_accounts: number;
  new_signups_7d: number;
  new_signups_30d: number;
  active_users_7d: number;
  active_users_30d: number;
  total_entries: number;
  entries_this_month: {
    income: number;
    expenses: number;
    giving: number;
    lent: number;
    total: number;
  };
  avg_entries_per_active_user_30d: number;
  signups_per_week: WeeklyMetric[];
  active_users_per_week: WeeklyMetric[];
  generated_at: string; // ISO 8601 timestamp
}


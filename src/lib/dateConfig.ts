// Date configuration for delivery system
// This can be later moved to Supabase or an admin panel

export interface DateConfig {
  seasonal: string[]; // Dates with $5 surcharge (YYYY-MM-DD format)
  closed: string[];   // Dates when store is closed (YYYY-MM-DD format)
}

// Default date configuration
// TODO: Load from Supabase or admin panel
export const defaultDateConfig: DateConfig = {
  seasonal: [
    "2026-02-14", // Valentine's Day
    "2026-05-10", // Mother's Day
    "2026-12-24", // Christmas Eve
    "2026-12-31", // New Year's Eve
  ],
  closed: [
    "2026-01-01", // New Year's Day
    "2026-12-25", // Christmas Day
    "2026-12-26", // Boxing Day
  ],
};

// Helper functions
export const isSeasonalDate = (date: string, config: DateConfig = defaultDateConfig): boolean => {
  return config.seasonal.includes(date);
};

export const isClosedDate = (date: string, config: DateConfig = defaultDateConfig): boolean => {
  return config.closed.includes(date);
};

export const getSeasonalSurcharge = (date: string, config: DateConfig = defaultDateConfig): number => {
  return isSeasonalDate(date, config) ? 5 : 0;
};

// Format date for comparison (YYYY-MM-DD)
export const formatDateForComparison = (date: Date | string): string => {
  if (typeof date === 'string') {
    return date.split('T')[0]; // Remove time if present
  }
  return date.toISOString().split('T')[0];
};

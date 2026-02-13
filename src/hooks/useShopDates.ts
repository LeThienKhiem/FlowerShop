import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { defaultDateConfig, DateConfig, isSeasonalDate, isClosedDate, getSeasonalSurcharge } from '../lib/dateConfig';

const STORE_SETTINGS_ID = 1;

// Hook to manage shop dates (seasonal and closed dates)
export const useShopDates = () => {
  const [dateConfig, setDateConfig] = useState<DateConfig>(defaultDateConfig);
  const [isLoading, setIsLoading] = useState(false);

  // Load date configuration from Supabase store_settings (closed_dates)
  useEffect(() => {
    const loadDateConfig = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('closed_dates')
          .eq('id', STORE_SETTINGS_ID)
          .maybeSingle();

        if (error) {
          console.error('Error loading store_settings:', error);
          setDateConfig(defaultDateConfig);
          return;
        }

        const closedDates = Array.isArray(data?.closed_dates)
          ? (data.closed_dates as string[]).filter((d): d is string => typeof d === 'string')
          : defaultDateConfig.closed;

        setDateConfig({
          ...defaultDateConfig,
          closed: closedDates,
        });
      } catch (error) {
        console.error('Error loading date config:', error);
        setDateConfig(defaultDateConfig);
      } finally {
        setIsLoading(false);
      }
    };

    loadDateConfig();
  }, []);

  // Check if a date is seasonal
  const checkIsSeasonal = (date: string): boolean => {
    return isSeasonalDate(date, dateConfig);
  };

  // Check if a date is closed
  const checkIsClosed = (date: string): boolean => {
    return isClosedDate(date, dateConfig);
  };

  // Get seasonal surcharge for a date
  const getSurcharge = (date: string): number => {
    return getSeasonalSurcharge(date, dateConfig);
  };

  // Check if date is available (not closed)
  const isDateAvailable = (date: string): boolean => {
    return !checkIsClosed(date);
  };

  // Update date configuration (for admin) — persists to store_settings
  const updateDateConfig = async (newConfig: DateConfig): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('store_settings')
        .upsert(
          { id: STORE_SETTINGS_ID, closed_dates: newConfig.closed },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('Error saving store_settings:', error);
        return false;
      }

      setDateConfig(newConfig);
      return true;
    } catch (error) {
      console.error('Error updating date config:', error);
      return false;
    }
  };

  return {
    dateConfig,
    isLoading,
    checkIsSeasonal,
    checkIsClosed,
    getSurcharge,
    isDateAvailable,
    updateDateConfig,
  };
};

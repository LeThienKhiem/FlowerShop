import { useState, useEffect } from 'react';
import { defaultDateConfig, DateConfig, isSeasonalDate, isClosedDate, getSeasonalSurcharge } from '../lib/dateConfig';

// Hook to manage shop dates (seasonal and closed dates)
export const useShopDates = () => {
  const [dateConfig, setDateConfig] = useState<DateConfig>(defaultDateConfig);
  const [isLoading, setIsLoading] = useState(false);

  // Load date configuration from Supabase (if available)
  useEffect(() => {
    const loadDateConfig = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual Supabase table when ready
        // const { data, error } = await supabase
        //   .from('date_config')
        //   .select('*')
        //   .single();
        
        // For now, use default config
        setDateConfig(defaultDateConfig);
      } catch (error) {
        console.error('Error loading date config:', error);
        setDateConfig(defaultDateConfig); // Fallback to default
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

  // Update date configuration (for admin)
  const updateDateConfig = async (newConfig: DateConfig): Promise<boolean> => {
    try {
      // TODO: Save to Supabase when ready
      // const { error } = await supabase
      //   .from('date_config')
      //   .upsert({ id: 1, ...newConfig });
      
      // For now, just update local state
      setDateConfig(newConfig);
      
      // TODO: Save to localStorage as backup
      localStorage.setItem('dateConfig', JSON.stringify(newConfig));
      
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

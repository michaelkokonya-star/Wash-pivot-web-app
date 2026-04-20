import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface PricingRules {
  [key: string]: number;
}

interface DeliveryRules {
  baseRate: number;
  ratePerKm: number;
  freeThreshold: number;
}

interface SettingsContextType {
  pricingRules: PricingRules;
  deliveryRules: DeliveryRules | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pricingRules, setPricingRules] = useState<PricingRules>({});
  const [deliveryRules, setDeliveryRules] = useState<DeliveryRules | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const [pricingRes, deliveryRes] = await Promise.all([
        fetch('/api/settings/pricing-rules'),
        fetch('/api/settings/delivery-rules')
      ]);

      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        setPricingRules(pricingData);
      }

      if (deliveryRes.ok) {
        const deliveryData = await deliveryRes.json();
        setDeliveryRules(deliveryData);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ 
      pricingRules, 
      deliveryRules, 
      loading, 
      refreshSettings: fetchSettings 
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

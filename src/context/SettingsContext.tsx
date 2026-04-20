import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

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
  updatePricingRules: (rules: PricingRules) => Promise<void>;
  updateDeliveryRules: (rules: DeliveryRules) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pricingRules, setPricingRules] = useState<PricingRules>({
    'Solar Panels': 150,
    'Batteries': 800,
    'Inverter': 12000,
    'Charge Controller': 500
  });
  const [deliveryRules, setDeliveryRules] = useState<DeliveryRules | null>({
    baseRate: 200,
    ratePerKm: 50,
    freeThreshold: 50000
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [pricingDoc, deliveryDoc] = await Promise.all([
        getDoc(doc(db, 'settings', 'pricing_rules')),
        getDoc(doc(db, 'settings', 'delivery_rules'))
      ]);

      if (pricingDoc.exists()) {
        setPricingRules(pricingDoc.data().value || {});
      }

      if (deliveryDoc.exists()) {
        setDeliveryRules(deliveryDoc.data().value || null);
      }
    } catch (error) {
      console.error("Error fetching settings from Firestore:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePricingRules = async (rules: PricingRules) => {
    try {
      await setDoc(doc(db, 'settings', 'pricing_rules'), {
        value: rules,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setPricingRules(rules);
    } catch (error) {
      console.error("Error updating pricing rules:", error);
      throw error;
    }
  };

  const updateDeliveryRules = async (rules: DeliveryRules) => {
    try {
      await setDoc(doc(db, 'settings', 'delivery_rules'), {
        value: rules,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setDeliveryRules(rules);
    } catch (error) {
      console.error("Error updating delivery rules:", error);
      throw error;
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchSettings();

    // Set up real-time listeners for instant updates
    const unsubscribePricing = onSnapshot(doc(db, 'settings', 'pricing_rules'), (doc) => {
      if (doc.exists()) {
        setPricingRules(doc.data().value || {});
      }
    });

    const unsubscribeDelivery = onSnapshot(doc(db, 'settings', 'delivery_rules'), (doc) => {
      if (doc.exists()) {
        setDeliveryRules(doc.data().value || null);
      }
    });

    return () => {
      unsubscribePricing();
      unsubscribeDelivery();
    };
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ 
      pricingRules, 
      deliveryRules, 
      loading, 
      refreshSettings: fetchSettings,
      updatePricingRules,
      updateDeliveryRules
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

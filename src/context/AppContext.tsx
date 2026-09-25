import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Product, Settings, Notification } from '@/types';
import { products as initialProducts, defaultSettings, notifications as initialNotifications } from '@/data/mockData';
import { computeStockStatus } from '@/utils/format';
import { toast } from 'sonner';

interface AppContextValue {
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Products (session state)
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'status' | 'createdAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  adjustStock: (id: string, adjustment: number, reason: string) => void;
  deleteProduct: (id: string) => void;

  // Settings
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;

  // Notifications
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadCount: number;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      setSettings((s) => ({ ...s, theme: next }));
      return next;
    });
  }, []);

  const addProduct = useCallback((product: Omit<Product, 'id' | 'status' | 'createdAt'>) => {
    const newId = `prod-${Date.now()}`;
    const status = computeStockStatus(product.currentStock, product.reorderPoint);
    const newProduct: Product = {
      ...product,
      id: newId,
      status,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [...prev, newProduct]);
    toast.success('Product added', { description: `${newProduct.name} has been added to inventory.` });
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        if (updates.currentStock !== undefined || updates.reorderPoint !== undefined) {
          updated.status = computeStockStatus(updated.currentStock, updated.reorderPoint);
        }
        return updated;
      }),
    );
    toast.success('Product updated', { description: 'Changes have been saved.' });
  }, []);

  const adjustStock = useCallback((id: string, adjustment: number, reason: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const newStock = Math.max(0, p.currentStock + adjustment);
        return {
          ...p,
          currentStock: newStock,
          status: computeStockStatus(newStock, p.reorderPoint),
        };
      }),
    );
    const product = products.find((p) => p.id === id);
    toast.success('Stock adjusted', {
      description: `${product?.name}: ${adjustment > 0 ? '+' : ''}${adjustment} units (${reason})`,
    });
  }, [products]);

  const deleteProduct = useCallback((id: string) => {
    const product = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success('Product removed', { description: `${product?.name} has been removed.` });
  }, [products]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    if (updates.theme && updates.theme !== theme) {
      setTheme(updates.theme);
    }
  }, [theme]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        products,
        addProduct,
        updateProduct,
        adjustStock,
        deleteProduct,
        settings,
        updateSettings,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        unreadCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

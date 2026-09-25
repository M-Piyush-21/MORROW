import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { Layout } from '@/components/layout/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { DemandForecastPage } from '@/pages/DemandForecastPage';
import { RestockRecommendationsPage } from '@/pages/RestockRecommendationsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { ModelPerformancePage } from '@/pages/ModelPerformancePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="forecast" element={<DemandForecastPage />} />
            <Route path="restock" element={<RestockRecommendationsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="model" element={<ModelPerformancePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <Toaster />
      </AppProvider>
    </BrowserRouter>
  );
}

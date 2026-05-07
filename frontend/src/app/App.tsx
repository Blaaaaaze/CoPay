import { Routes, Route } from "react-router-dom";
import { PreferenceSync } from "./PreferenceSync";
import { AppShell } from "../ui/templates/AppShell";
import { AppHeader } from "../ui/organisms/AppHeader";
import { AppFooter } from "../ui/organisms/AppFooter";
import { HomePage } from "../pages/home/HomePage";
import { CalculatorPage } from "../pages/calculator/CalculatorPage";
import { RoomsListPage } from "../pages/rooms/RoomsListPage";
import { RoomDetailPage } from "../pages/rooms/RoomDetailPage";
import { ContactsPage } from "../pages/contacts/ContactsPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { AdhocResultPage } from "../pages/adhoc/AdhocResultPage";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { ToastHost } from "../shared/ui/ToastHost";

export default function App() {
  return (
    <AppShell>
      <PreferenceSync />
      <AppHeader />
      <ToastHost />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/rooms" element={<RoomsListPage />} />
          <Route path="/rooms/:roomId" element={<RoomDetailPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/r/:id" element={<AdhocResultPage />} />
        </Routes>
      </main>
      <AppFooter />
    </AppShell>
  );
}

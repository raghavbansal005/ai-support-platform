import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import ForgotPasswordPage from "./pages/ForgotPassword";
import DashboardPage from "./pages/Dashboard";
import KnowledgeBasePage from "./pages/KnowledgeBase";
import AIConfigPage from "./pages/AIConfig";
import TicketsPage from "./pages/Tickets";
import EscalationsPage from "./pages/Escalations";
import ConversationsPage from "./pages/Conversations";
import AnalyticsPage from "./pages/Analytics";
import { getToken } from "./lib/api";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={getToken() ? "/dashboard" : "/login"} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="/ai-config" element={<AIConfigPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/escalations" element={<EscalationsPage />} />
        <Route path="/conversations" element={<ConversationsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

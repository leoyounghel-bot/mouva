import { Routes, Route, useSearchParams, Navigate } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import Designer from "./routes/Designer";
import AiDesigner from "./routes/AiDesigner";
import FormAndViewer from "./routes/FormAndViewer";
import Templates from "./routes/Templates";
import LandingPage from "./routes/LandingPage";
import AuthPage from "./routes/AuthPage";
import VerifyMagicLinkPage from "./routes/VerifyMagicLinkPage";
import Pricing from "./routes/Pricing";
import PrivacyPolicy from "./routes/PrivacyPolicy";
import TermsOfService from "./routes/TermsOfService";

export default function App() {
  const [searchParams] = useSearchParams();
  const isEmbedded = searchParams.get("embed") === "true";

  return (
    <div className="min-h-screen flex flex-col">

      <Routes>
        <Route path={"/"} element={<LandingPage />} />
        <Route path={"/auth"} element={<AuthPage />} />
        <Route path={"/verify-magic"} element={<VerifyMagicLinkPage />} />
        <Route path={"/designer"} element={<Navigate to="/ai-designer" replace />} />
        <Route path="/ai-designer" element={<AiDesigner />} />
        <Route path="/form-viewer" element={<FormAndViewer />} />
        <Route path="/templates" element={<Templates isEmbedded={isEmbedded} />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
      <ToastContainer />
    </div>
  );
}

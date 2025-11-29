import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import RegistroPaciente from "./pages/RegistroPaciente";
import AdminDashboard from "./pages/AdminDashboard";
import MedicoDashboard from "./pages/MedicoDashboard";
import PacienteDashboard from "./pages/PacienteDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";

function App() {
  return (
    <Routes>
      {/* Autenticación */}
      <Route path="/" element={<Login />} />
      <Route path="/registro" element={<RegistroPaciente />} />

      {/* Dashboards */}
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/medico-dashboard" element={<MedicoDashboard />} />
      <Route path="/paciente-dashboard" element={<PacienteDashboard />} />
      <Route path="/superadmin-dashboard" element={<SuperAdminDashboard />} />
    </Routes>
  );
}

export default App;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../components/axios";
const API_URL = import.meta.env.VITE_API_URL;

function RegistroPaciente() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [obraSocial, setObraSocial] = useState("");
  const [detallesExtras, setDetallesExtras] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const navigate = useNavigate();

  const handleRegistro = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (!email.includes("@")) {
      setError("El correo debe ser válido.");
      return;
    }
    if (contrasena.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    try {
      setCargando(true);
      const res = await api.post(`${API_URL}/api/auth/registro`, {
        nombre,
        apellido,
        email,
        contrasena,
        tipo: "paciente",
        obra_social: obraSocial,
        detalles_extras: detallesExtras,
      });

      setMensaje("Registro exitoso. Redirigiendo al login...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.mensaje || "No se pudo registrar el paciente.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Registro de Paciente</h2>
      <form onSubmit={handleRegistro}>
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <br />
        <input
          type="text"
          placeholder="Apellido"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          required
        />
        <br />
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br />
        <input
          type="password"
          placeholder="Contraseña"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
        />
        <br />
        <input
          type="text"
          placeholder="Obra Social (opcional)"
          value={obraSocial}
          onChange={(e) => setObraSocial(e.target.value)}
        />
        <br />
        <textarea
          placeholder="Detalles extras (opcional)"
          value={detallesExtras}
          onChange={(e) => setDetallesExtras(e.target.value)}
          rows="4"
        />
        <br />
        <button type="submit" disabled={cargando}>
          {cargando ? "Registrando..." : "Registrarse"}
        </button>
      </form>

      {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default RegistroPaciente;

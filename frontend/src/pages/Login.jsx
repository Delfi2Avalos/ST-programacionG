import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../components/axios";
import { conectarSocket } from "../components/socket";
const API_URL = import.meta.env.VITE_API_URL;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();


  // Iniciar sesión
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const res = await api.post(`${API_URL}/api/auth/login`, {
        email,
        contrasena: password,
      });

      const { token, usuario } = res.data || {};

      if (!usuario || !usuario.tipo) {
        throw new Error("Usuario no válido o sin tipo asignado.");
      }

      // Guardar token y datos del usuario
      localStorage.setItem("token", token);
      localStorage.setItem("usuario", JSON.stringify(usuario));

      //Conectar socket con token válido
      conectarSocket();

      console.log(` Usuario autenticado: ${usuario.email}`);
      console.log(` Tipo de usuario: ${usuario.tipo}`);

      //  Redirigir según el tipo de usuario
      const rutas = {
        paciente: "/paciente-dashboard",
        medico: "/medico-dashboard",
        admin: "/admin-dashboard",
        superadmin: "/superadmin-dashboard",
      };

      navigate(rutas[usuario.tipo] || "/");
    } catch (err) {
      console.error("Error en login:", err);
      const mensaje =
        err?.response?.data?.mensaje ||
        err?.message ||
        " Error desconocido en inicio de sesión.";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  };

  // Renderizado del formulario

  return (
    <div className="container">
      <h2>Iniciar sesión</h2>
      <form onSubmit={handleLogin}>
        <label>Correo electrónico:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Contraseña:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={cargando}>
          {cargando ? "Verificando..." : "Ingresar"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <p>
        ¿No tenés cuenta?{" "}
        <span
          onClick={() => navigate("/registro")}
          style={{
            color: "blue",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Registrate aquí
        </span>
      </p>
    </div>
  );
}

export default Login;

import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "../styles.css";
import LogoutButton from "../components/LogoutButton";
import api from "../components/axios";

function SuperAdminDashboard() {
  const { state } = useLocation();
  // puede venir por navegación o lo tomamos del localStorage
  const superadmin = state?.usuario || JSON.parse(localStorage.getItem("usuario") || "null");

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");

  const [especialidades, setEspecialidades] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [horarios, setHorarios] = useState([]);

  const [mensaje, setMensaje] = useState("");

  const [formularios, setFormularios] = useState([]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtromedicoEmail, setFiltromedicoEmail] = useState("");

  const [medicos, setMedicos] = useState([]);
  const [especialidadId, setEspecialidadId] = useState("");
  const [pacientesAtendidos, setPacientesAtendidos] = useState(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [activeTab, setActiveTab] = useState("registrar");

  //cargar especialidades (por ahora hardcode)
  useEffect(() => {
    setEspecialidades([
      { id: 1, nombre: "Clínica" },
      { id: 2, nombre: "Pediatría" },
      { id: 3, nombre: "Cardiología" },
      { id: 4, nombre: "Ginecología" },
    ]);
  }, []);

  const toggleEspecialidad = (id) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const agregarHorario = () => {
    setHorarios((prev) => [
      ...prev,
      { dia_semana: "", hora_inicio: "", hora_fin: "" },
    ]);
  };

  const actualizarHorario = (i, campo, valor) => {
    const nuevos = [...horarios];
    nuevos[i][campo] = valor;
    setHorarios(nuevos);
  };

  //registrar médico
const registrarMedico = async () => {
  // Validación de campos básicos
  if (!nombre || !apellido || !email || !contrasena) {
    setMensaje("Completa todos los campos para registrar al médico.");
    return;
  }

  // Validación obligatoria de especialidades
  if (!seleccionadas || seleccionadas.length === 0) {
    setMensaje("Debes seleccionar al menos una especialidad.");
    return;
  }

  // Validación obligatoria de horarios
  if (!horarios || horarios.length === 0) {
    setMensaje("Debes agregar al menos un horario para el médico.");
    return;
  }

  try {
    const res = await api.post("/superadmin/registrar-medico", {
      nombre,
      apellido,
      email,
      contrasena,
      tipo: "medico",
      especialidades: seleccionadas,
      horarios,
    });

    setMensaje(res.data.mensaje || "Médico registrado correctamente.");

    // Limpiar campos
    setNombre("");
    setApellido("");
    setEmail("");
    setContrasena("");
    setSeleccionadas([]);
    setHorarios([]);

  } catch (err) {
    console.error("Error al registrar médico:", err);
    setMensaje("Error al registrar médico.");
  }
};


  //crear nuevo administrador (secretario)
  const crearAdmin = async () => {
    if (!nombre || !apellido || !email || !contrasena) {
      setMensaje("Completa todos los campos para crear el administrador.");
      return;
    }

    try {
      const res = await api.post("/superadmin/crear-admin", {
        nombre,
        apellido,
        email,
        contrasena,
      });

      setMensaje(res.data.mensaje || "Administrador creado correctamente.");
      setNombre("");
      setApellido("");
      setEmail("");
      setContrasena("");
    } catch (err) {
      console.error("Error al crear administrador:", err);
      setMensaje("Error al crear administrador.");
    }
  };

  //buscar médicos por especialidad
  const buscarMedicosPorEspecialidad = async () => {
    if (!especialidadId) return;

    try {
      const res = await api.get(
        `/superadmin/medicos-por-especialidad/${especialidadId}`
      );
      setMedicos(res.data || []);
    } catch (err) {
      console.error("Error al buscar médicos:", err);
    }
  };

  //ver pacientes atendidos por médico en rango
  const obtenerCantidadAtendidos = async (id) => {
    try {
      const res = await api.get(
        `/superadmin/pacientes-atendidos/${id}`,
        {
          params: {
            desde: desde || "",
            hasta: hasta || "",
          },
        }
      );
      setPacientesAtendidos({ id, cantidad: res.data.cantidad });
    } catch (err) {
      console.error("Error al obtener pacientes atendidos:", err);
    }
  };

  //buscar formularios
  const buscarFormularios = async () => {
    try {
      const res = await api.get("/superadmin/formularios", {
        params: {
          nombre_completo: filtroNombre,
          medico_email: filtromedicoEmail,
        },
      });
      setFormularios(res.data || []);
    } catch (err) {
      console.error("Error al buscar formularios:", err);
    }
  };

  return (
    <div className="container">
      <div>
        <LogoutButton />
      </div>

      <h2>Panel del Super Administrador</h2>
      <h4>
        Bienvenido/a, {superadmin?.nombre} {superadmin?.apellido}
      </h4>

      <div className="tabs-container">
        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === "registrar" ? "active" : ""}`}
            onClick={() => {
              setMensaje("");
              setActiveTab("registrar");
            }}
          >
            Registrar Médico
          </button>
          <button
            className={`tab-btn ${activeTab === "crear-admin" ? "active" : ""}`}
            onClick={() => {
              setMensaje("");
              setActiveTab("crear-admin");
            }}
          >
            Crear Administrador
          </button>
          <button
            className={`tab-btn ${activeTab === "buscar" ? "active" : ""}`}
            onClick={() => {
              setMensaje("");
              setActiveTab("buscar");
            }}
          >
            Buscar Médicos
          </button>
          <button
            className={`tab-btn ${
              activeTab === "formularios" ? "active" : ""
            }`}
            onClick={() => {
              setMensaje("");
              setActiveTab("formularios");
            }}
          >
            Formularios
          </button>
        </div>

        <div className="tab-content">
          {/* Registrar Médico */}
          {activeTab === "registrar" && (
            <>
              <h3>Registrar Médico</h3>
              <input
                type="text"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
              <input
                type="text"
                placeholder="Apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
              />

              <h4>Especialidades:</h4>
              {especialidades.map((e) => (
                <label key={e.id}>
                  <input
                    type="checkbox"
                    value={e.id}
                    checked={seleccionadas.includes(e.id)}
                    onChange={() => toggleEspecialidad(e.id)}
                  />{" "}
                  {e.nombre}
                </label>
              ))}

              <h4>Horarios:</h4>
              {horarios.map((h, i) => (
                <div key={i}>
                  <select
                    value={h.dia_semana}
                    onChange={(e) =>
                      actualizarHorario(i, "dia_semana", e.target.value)
                    }
                  >
                    <option value="">Día</option>
                    {[
                      "Lunes",
                      "Martes",
                      "Miércoles",
                      "Jueves",
                      "Viernes",
                      "Sábado",
                    ].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={h.hora_inicio}
                    onChange={(e) =>
                      actualizarHorario(i, "hora_inicio", e.target.value)
                    }
                  />
                  <input
                    type="time"
                    value={h.hora_fin}
                    onChange={(e) =>
                      actualizarHorario(i, "hora_fin", e.target.value)
                    }
                  />
                </div>
              ))}
              <button onClick={agregarHorario}>Agregar Horario</button>
              <button onClick={registrarMedico}>Registrar Médico</button>
              {mensaje && <p>{mensaje}</p>}
            </>
          )}

          {/* Crear Administrador */}
          {activeTab === "crear-admin" && (
            <>
              <h3>Registrar Administrador o Secretario</h3>
              <input
                type="text"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
              <input
                type="text"
                placeholder="Apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
              />
              <button onClick={crearAdmin}>Crear Administrador</button>
              {mensaje && <p>{mensaje}</p>}
            </>
          )}

          {/* Buscar Médicos */}
          {activeTab === "buscar" && (
            <>
              <h3>Buscar Médicos por Especialidad</h3>
              <select
                value={especialidadId}
                onChange={(e) => setEspecialidadId(e.target.value)}
              >
                <option value="">Seleccionar</option>
                {especialidades.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
              <button onClick={buscarMedicosPorEspecialidad}>Buscar</button>

              {medicos.length > 0 && (
                <ul>
                  {medicos.map((m) => (
                    <li key={m.id}>
                      {m.nombre} {m.apellido} ({m.email})
                      <br />
                      Desde:{" "}
                      <input
                        type="date"
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                      />
                      Hasta:{" "}
                      <input
                        type="date"
                        value={hasta}
                        onChange={(e) => setHasta(e.target.value)}
                      />
                      <button onClick={() => obtenerCantidadAtendidos(m.id)}>
                        Ver pacientes atendidos
                      </button>
                      {pacientesAtendidos?.id === m.id && (
                        <span> → {pacientesAtendidos.cantidad} pacientes</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* Formularios */}
          {activeTab === "formularios" && (
            <>
              <h3>Buscar Formularios Médicos</h3>
              <input
                type="text"
                placeholder="Nombre del paciente"
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
              />
              <input
                type="text"
                placeholder="Correo del médico (opcional)"
                value={filtromedicoEmail}
                onChange={(e) => setFiltromedicoEmail(e.target.value)}
              />

              <button onClick={buscarFormularios}>Buscar Formularios</button>

              {formularios.length > 0 && (
                <ul>
                  {formularios.map((f) => (
                    <li key={f.id}>
                      <strong>{f.nombre_completo}</strong> –{" "}
                      {new Date(f.fecha).toLocaleString()}
                      <pre>{f.contenido}</pre>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;

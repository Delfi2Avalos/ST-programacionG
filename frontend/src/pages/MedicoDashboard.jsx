import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "../styles.css";
import LogoutButton from "../components/LogoutButton";
import api from "../components/axios";

function MedicoDashboard() {
  const { state } = useLocation();
  const medico =
    state?.usuario || JSON.parse(localStorage.getItem("usuario") || "null");

  // Tabs 
  const [activeTab, setActiveTab] = useState("turnos");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  // Turnos 
  const [turnos, setTurnos] = useState([]);
  const [todosLosTurnos, setTodosLosTurnos] = useState([]);
  const [filtroFecha, setFiltroFecha] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Horarios 
  const [horarios, setHorarios] = useState([]);
  const [nuevoHorario, setNuevoHorario] = useState({
    dia_semana: "",
    hora_inicio: "",
    hora_fin: "",
  });

  // Contraseña
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [mensajeContrasena, setMensajeContrasena] = useState("");

  // Formularios clínicos
  const [nombrePaciente, setNombrePaciente] = useState("");
  const [formulario, setFormulario] = useState(
    "Nombre:\nEdad:\nPeso:\nAltura:\nMotivo de consulta:\nTratamiento:"
  );
  const [mensajeFormulario, setMensajeFormulario] = useState("");
  const [listaVisible, setListaVisible] = useState([]);
  const [editarFormularioId, setEditarFormularioId] = useState(null);
  const [formularioEditado, setFormularioEditado] = useState("");

  // Cargar Turnos + Horarios al entrar
  useEffect(() => {
    if (!medico?.id) return;

    const cargarDatos = async () => {
      try {
        const turnosRes = await api.get(`/medicos/turnos/${medico.id}`);
        const todos = Array.isArray(turnosRes.data) ? turnosRes.data : [];
        setTodosLosTurnos(todos);

        const hoy = new Date().toISOString().split("T")[0];
        const deHoy = todos.filter(
          (t) => new Date(t.fecha).toISOString().split("T")[0] === hoy
        );
        setTurnos(deHoy);

        const horariosRes = await api.get(`/medicos/horarios/${medico.id}`);
        setHorarios(Array.isArray(horariosRes.data) ? horariosRes.data : []);
      } catch {
        setError("Error al cargar los turnos u horarios.");
      }
    };

    cargarDatos();
  }, [medico?.id]);

  // Cargar formularios al entrar en la pestaña correspondiente
  useEffect(() => {
    if (activeTab === "formularios" && medico?.id) {
      obtenerFormulariosDelMedico();
    }
  }, [activeTab, medico?.id]);

  // Helpers
  const formatearHora = (h) => {
    if (!h) return "";
    const [hh, mm] = h.split(":");
    return `${hh}:${mm}`;
  };

  // Gestión de Turnos
  const cambiarFecha = (e) => {
    const fechaSeleccionada = e.target.value;
    setFiltroFecha(fechaSeleccionada);
    const filtrados = todosLosTurnos.filter(
      (t) => new Date(t.fecha).toISOString().split("T")[0] === fechaSeleccionada
    );
    setTurnos(filtrados);
  };

  const cambiarEstado = async (turnoId, nuevoEstado) => {
    setMensaje("");
    setError("");
    try {
      await api.put(`/medicos/turnos/${turnoId}`, { estado: nuevoEstado });
      setMensaje("Estado actualizado.");

      const res = await api.get(`/medicos/turnos/${medico.id}`);
      const todos = Array.isArray(res.data) ? res.data : [];
      setTodosLosTurnos(todos);

      const filtrados = todos.filter(
        (t) => new Date(t.fecha).toISOString().split("T")[0] === filtroFecha
      );
      setTurnos(filtrados);
    } catch {
      setError("No se pudo actualizar el estado.");
    }
  };

  // Gestión de Horarios
  const actualizarHorario = (campo, valor) => {
    setNuevoHorario((prev) => ({
      ...prev,
      [campo]: campo.includes("hora") ? formatearHora(valor) : valor,
    }));
  };

  const eliminarHorario = async (index) => {
    const nuevos = horarios.filter((_, i) => i !== index);
    setHorarios(nuevos);
    try {
      await api.put(`/medicos/actualizar-horarios/${medico.id}`, {
        horarios: nuevos,
      });
      setMensaje("Horario eliminado correctamente.");
      setError("");
    } catch {
      setError("Error al eliminar horario.");
    }
  };

  const guardarHorarios = async () => {
    const { dia_semana, hora_inicio, hora_fin } = nuevoHorario;
    if (!dia_semana || !hora_inicio || !hora_fin) {
      setError("Completá día y horas.");
      return;
    }
    if (hora_inicio >= hora_fin) {
      setError("La hora de inicio debe ser menor a la hora de fin.");
      return;
    }

    try {
      const nuevos = [...horarios, nuevoHorario];
      await api.put(`/medicos/actualizar-horarios/${medico.id}`, {
        horarios: nuevos,
      });
      setHorarios(nuevos);
      setNuevoHorario({ dia_semana: "", hora_inicio: "", hora_fin: "" });
      setMensaje("Horario actualizado correctamente.");
      setError("");
    } catch {
      setError("Error al actualizar los horarios.");
    }
  };

  // Gestión de Contraseña
  const cambiarContrasena = async () => {
    if (!nuevaContrasena) {
      setMensajeContrasena("La nueva contraseña no puede estar vacía.");
      return;
    }
    try {
      await api.put(`/medicos/cambiar-contrasena/${medico.id}`, {
        nueva_contrasena: nuevaContrasena,
      });
      setMensajeContrasena("Contraseña actualizada correctamente.");
      setNuevaContrasena("");
    } catch {
      setMensajeContrasena("Error al actualizar la contraseña.");
    }
  };

  // Gestión de Formularios Clínicos
  const enviarFormulario = async () => {
    if (!nombrePaciente.trim()) {
      setMensajeFormulario("Ingrese el nombre del paciente.");
      return;
    }
    try {
      const res = await api.post(`/medicos/formulario`, {
        medico_id: medico.id,
        nombre_completo: nombrePaciente.trim(),
        contenido: formulario,
      });
      setMensajeFormulario(res.data.mensaje || "Formulario enviado.");
      setNombrePaciente("");
      setFormulario(
        "Nombre:\nEdad:\nPeso:\nAltura:\nMotivo de consulta:\nTratamiento:"
      );
      obtenerFormulariosDelMedico();
    } catch {
      setMensajeFormulario("Error al enviar el formulario.");
    }
  };

  const buscarFormularios = async () => {
    if (!nombrePaciente.trim()) {
      setMensajeFormulario("Ingrese un DNI a buscar.");
      return;
    }
    try {
      const res = await api.get(
        `/medicos/formularios-nombre/${encodeURIComponent(
          nombrePaciente.trim()
        )}`
      );
      const data = Array.isArray(res.data) ? res.data : [res.data];
      setListaVisible(data);
      setMensajeFormulario(data.length ? "" : "No se encontraron formularios.");
    } catch (err) {
      if (err.response?.status === 404) {
        setListaVisible([]);
        setMensajeFormulario("No se encontraron formularios.");
      } else {
        setMensajeFormulario("Error al buscar formularios.");
      }
    }
  };

  const obtenerFormulariosDelMedico = async () => {
    try {
      const res = await api.get(`/medicos/formularios/${medico.id}`);
      setListaVisible(Array.isArray(res.data) ? res.data : []);
      setMensajeFormulario("");
    } catch {
      setListaVisible([]);
      setMensajeFormulario("Error al obtener formularios del médico.");
    }
  };

  const empezarEdicion = (form) => {
    setEditarFormularioId(form.id);
    setFormularioEditado(form.contenido || "");
    setMensajeFormulario(
      `Editando el formulario de "${form.nombre_completo}" (ID ${form.id})`
    );
  };

  const guardarEdicionFormulario = async () => {
    if (!editarFormularioId) return;
    try {
      const fecha = new Date().toLocaleDateString("es-AR");
      const nuevoMotivo = prompt("Nuevo motivo de consulta:") || "Sin motivo";
      const nuevoTratamiento =
        prompt("Nuevo tratamiento:") || "Sin tratamiento";
      const nuevaEntrada = `\n---\nFecha: ${fecha}\nMotivo: ${nuevoMotivo}\nTratamiento: ${nuevoTratamiento}\n`;
      const nuevoContenido = `${formularioEditado}${nuevaEntrada}`;

      await api.put(`/medicos/formulario/${editarFormularioId}`, {
        contenido: nuevoContenido,
      });

      setMensajeFormulario("Formulario actualizado correctamente.");
      setEditarFormularioId(null);
      setFormularioEditado("");
      obtenerFormulariosDelMedico();
    } catch {
      alert("Error al editar el formulario.");
    }
  };

// Render
return (
  <div className="container">
    <LogoutButton />
    <h2>
      Panel del médico/a {medico?.nombre} {medico?.apellido}
    </h2>

    <div className="tabs-container">
      <div className="tabs-header">
        {["turnos", "horarios", "formularios", "password"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => {
              setMensaje("");
              setError("");
              setActiveTab(tab);
            }}
          >
            {tab === "turnos" && "Turnos"}
            {tab === "horarios" && "Horarios"}
            {tab === "formularios" && "Formularios"}
            {tab === "password" && "Contraseña"}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {/* TURNOS */}
        {activeTab === "turnos" && (
          <>
            <h3>Gestión de Turnos</h3>
            <label>Filtrar por fecha:</label>
            <input type="date" value={filtroFecha} onChange={cambiarFecha} />

            {turnos.length === 0 ? (
              <p>No hay turnos para esta fecha.</p>
            ) : (
              turnos.map((turno) => (
                <div key={turno.id} className="card">
                  <p>
                    <strong>Paciente:</strong> {turno.paciente_nombre}{" "}
                    {turno.paciente_apellido}
                  </p>
                  <p>
                    <strong>Fecha:</strong>{" "}
                    {turno.fecha ? turno.fecha.slice(0, 10) : "—"}
                  </p>
                  <p>
                    <strong>Hora:</strong> {turno.hora}
                  </p>
                  <p>
                    <strong>Estado:</strong> {turno.estado}
                  </p>
                  <select
                    value={turno.estado}
                    onChange={(e) => cambiarEstado(turno.id, e.target.value)}
                  >
                    <option value="en espera">En espera</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="atendido">Atendido</option>
                  </select>
                </div>
              ))
            )}
          </>
        )}

        {/* HORARIOS  */}
        {activeTab === "horarios" && (
          <>
            <h3>Horarios de Atención</h3>
            {horarios.length === 0 && <p>Aún no cargaste horarios.</p>}

            {horarios.map((h, i) => (
              <div key={i} className="card">
                <p>
                  {h.dia_semana} — {h.hora_inicio?.slice(0, 5)} a{" "}
                  {h.hora_fin?.slice(0, 5)}
                </p>
                <button onClick={() => eliminarHorario(i)}>Eliminar</button>
              </div>
            ))}

            <div className="inline-form">
              <select
                value={nuevoHorario.dia_semana}
                onChange={(e) =>
                  actualizarHorario("dia_semana", e.target.value)
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
                step="1800"
                value={nuevoHorario.hora_inicio}
                onChange={(e) => actualizarHorario("hora_inicio", e.target.value)}
              />
              <input
                type="time"
                step="1800"
                value={nuevoHorario.hora_fin}
                onChange={(e) => actualizarHorario("hora_fin", e.target.value)}
              />
              <button onClick={guardarHorarios}>Agregar Horario</button>
            </div>
          </>
        )}

        {/* FORMULARIOS */}
        {activeTab === "formularios" && (
          <>
            <h3>Formularios Médicos / Historial Clínico</h3>

            <div className="card">
              <p className="section-title">Nuevo formulario / evolución</p>
              <input
                type="text"
                placeholder="DNI del paciente"
                value={nombrePaciente}
                onChange={(e) => setNombrePaciente(e.target.value)}
              />
              <textarea
                rows={10}
                cols={50}
                value={formulario}
                onChange={(e) => setFormulario(e.target.value)}
              />
              <button onClick={enviarFormulario}>Guardar en historial</button>
            </div>

            <div className="inline-form">
              <button onClick={buscarFormularios}>
                DNI del paciente
              </button>
              <button onClick={obtenerFormulariosDelMedico}>
                Ver mis formularios
              </button>
            </div>

            {mensajeFormulario && (
              <p className="info-msg">{mensajeFormulario}</p>
            )}

            {listaVisible.map((f) => (
              <div key={f.id} className="card">
                <p>
                  <strong>Paciente:</strong> {f.nombre_completo}
                </p>
                <p>
                  <strong>Fecha:</strong>{" "}
                  {f.fecha ? new Date(f.fecha).toLocaleString("es-AR") : "—"}
                </p>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    background: "#f6f6f6",
                    padding: "0.5rem",
                    borderRadius: "4px",
                  }}
                >
                  {f.contenido}
                </pre>
                <button onClick={() => empezarEdicion(f)}>
                  Editar / Agregar nota
                </button>
              </div>
            ))}

            {listaVisible.length === 0 && (
              <p>No hay formularios para mostrar.</p>
            )}

            {editarFormularioId && (
              <div className="card warning-box">
                <p>
                  <strong>Editando Formulario #{editarFormularioId}</strong>
                </p>
                <textarea
                  rows={8}
                  cols={50}
                  value={formularioEditado}
                  onChange={(e) => setFormularioEditado(e.target.value)}
                />
                <button onClick={guardarEdicionFormulario}>
                  Guardar edición / Agregar nueva evolución
                </button>
                <button
                  onClick={() => {
                    setEditarFormularioId(null);
                    setFormularioEditado("");
                  }}
                  style={{ marginLeft: "0.5rem" }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </>
        )}

        {/* CONTRASEÑA */}
        {activeTab === "password" && (
          <>
            <h3>Cambiar Contraseña</h3>
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={nuevaContrasena}
              onChange={(e) => setNuevaContrasena(e.target.value)}
            />
            <button onClick={cambiarContrasena}>Actualizar contraseña</button>
            {mensajeContrasena && (
              <p className="info-msg">{mensajeContrasena}</p>
            )}
          </>
        )}
      </div>
    </div>

    {mensaje && <p className="ok-msg">{mensaje}</p>}
    {error && <p className="err-msg">{error}</p>}
  </div>
  
);
}
export default MedicoDashboard;
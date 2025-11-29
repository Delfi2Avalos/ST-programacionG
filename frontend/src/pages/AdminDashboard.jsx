import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Chat from "../components/chat.jsx";
import { socket } from "../components/socket.js";
import "../styles.css";
import LogoutButton from "../components/LogoutButton";
import api from "../components/axios";

function AdminDashboard() {
  const { state } = useLocation();
  const admin =
    state?.usuario || JSON.parse(localStorage.getItem("usuario") || "null");


  const [activeTab, setActiveTab] = useState("chat");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [pacientesChat, setPacientesChat] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [especialidades] = useState([
    { id: 1, nombre: "Clínica" },
    { id: 2, nombre: "Pediatría" },
    { id: 3, nombre: "Cardiología" },
    { id: 4, nombre: "Ginecología" },
  ]);
  const [medicos, setMedicos] = useState([]);
  const [seleccionada, setSeleccionada] = useState("");
  const [medico, setMedico] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [detalles, setDetalles] = useState("");
  const [turnos, setTurnos] = useState([]);
  const [horariosMedico, setHorariosMedico] = useState([]);
  const [horasOcupadas, setHorasOcupadas] = useState([]);

  //Formularios
  const [formularios, setFormularios] = useState([]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtromedicoEmail, setFiltromedicoEmail] = useState("");

  //Registrar conexión Socket.IO
  useEffect(() => {
    if (!admin?.id) return;
    socket.emit("registrarUsuario", admin.id, "admin");
    console.log(`Admin ${admin.nombre} registrado en Socket.IO`);
  }, [admin?.id, admin?.nombre]);

  // Escuchar eventos de chat
  useEffect(() => {
    if (!admin?.id) return;

    const manejarNuevoMensaje = (msg) => {
      console.log("[Socket] Nuevo mensaje recibido:", msg);
      if (activeTab === "chat") cargarConversaciones();
    };

    const manejarNuevaConversacion = (data) => {
      console.log("[Socket] Nueva conversación:", data);
      if (activeTab === "chat") cargarConversaciones();
    };

    socket.on("nuevoMensaje", manejarNuevoMensaje);
    socket.on("nuevaConversacion", manejarNuevaConversacion);

    return () => {
      socket.off("nuevoMensaje", manejarNuevoMensaje);
      socket.off("nuevaConversacion", manejarNuevaConversacion);
    };
  }, [activeTab, admin?.id]);

  //Chat
  const cargarConversaciones = async () => {
    if (!admin?.id) return;
    try {
      const res = await api.get(`/chat/usuario/${admin.id}`);
      setPacientesChat(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al cargar conversaciones:", err);
      setError("Error al cargar conversaciones.");
    }
  };

  useEffect(() => {
    if (activeTab === "chat") cargarConversaciones();
  }, [activeTab]);

  // Turnos de admin como Paciente
  const cargarTurnos = async () => {
    if (!admin?.id) return;
    try {
      const res = await api.get(`/pacientes/turnos/${admin.id}`);
      setTurnos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al cargar turnos:", err);
      setError("Error al cargar turnos.");
    }
  };

  useEffect(() => {
    if (admin?.id && activeTab === "turnos") cargarTurnos();
  }, [admin?.id, activeTab]);

  //Seleccionar especialidad
  const handleEspecialidad = async (e) => {
    const id = e.target.value;
    setSeleccionada(id);
    setMedico("");
    setMedicos([]);
    setFecha("");
    setHora("");
    setHorariosMedico([]);
    setHorasOcupadas([]);

    if (!id) return;

    try {
      const res = await api.get(`/admin/medicos-por-especialidad/${id}`);
      setMedicos(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Error al cargar médicos.");
    }
  };

  //Seleccionar médico
  const handleMedico = async (e) => {
    const id = e.target.value;
    setMedico(id);
    setFecha("");
    setHora("");
    setHorasOcupadas([]);

    if (!id) return;

    try {
      const res = await api.get(`/medicos/horarios/${id}`);
      setHorariosMedico(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Error al cargar horarios del médico.");
    }
  };

  //Cargar horas ocupadas 
  useEffect(() => {
    if (!fecha || !medico) return;

    api
      .get(`/medicos/ocupados/${medico}/${fecha}`)
      .then((res) =>
        setHorasOcupadas(Array.isArray(res.data) ? res.data : [])
      )
      .catch(() => console.error("Error al obtener horas ocupadas"));
  }, [fecha, medico]);

  // Obtener nombre de día
  const obtenerDiaSemana = (fechaStr) => {
    const dias = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];

    const fechaReal = fechaStr.includes("T")
      ? new Date(fechaStr)
      : new Date(fechaStr + "T00:00:00");

    return dias[fechaReal.getDay()];
  };

  // Generar bloques de 30 minutos
  const generarBloques = (inicio, fin) => {
    const bloques = [];
    const [hInicio, mInicio] = inicio.split(":").map(Number);
    const [hFin, mFin] = fin.split(":").map(Number);

    let h = hInicio;
    let m = mInicio;

    while (h < hFin || (h === hFin && m < mFin)) {
      bloques.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
      );
      m += 30;
      if (m >= 60) {
        m -= 60;
        h++;
      }
    }
    return bloques;
  };

  //Bloques disponibles admin
  const bloquesDisponiblesAdmin = () => {
    if (!fecha || horariosMedico.length === 0) return [];

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaSel = new Date(fecha + "T00:00:00");
    const fs = new Date(fechaSel);
    fs.setHours(0, 0, 0, 0);
    if (fs < hoy) return [];
    const dia = obtenerDiaSemana(fecha);

    const norm = (s) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const horariosDia = horariosMedico.filter(
      (h) => norm(h.dia_semana) === norm(dia)
    );

    let bloques = [];
    horariosDia.forEach((h) => {
      bloques = bloques.concat(generarBloques(h.hora_inicio, h.hora_fin));
    });

    // Si es hoy, filtrar horas pasadas
    const ahora = new Date();
    if (fs.getTime() === hoy.getTime()) {
      const ha = ahora.getHours();
      const ma = ahora.getMinutes();

      bloques = bloques.filter((b) => {
        const [h, m] = b.split(":").map(Number);
        if (h > ha) return true;
        if (h === ha && m > ma) return true;
        return false;
      });
    }

    return bloques.filter((b) => !horasOcupadas.includes(b));
  };

  //Solicitar turno

  const solicitarTurno = async () => {
    setMensaje("");
    setError("");

    if (!seleccionada || !medico || !fecha || !hora) {
      setError("Debes completar todos los campos del turno.");
      return;
    }

    try {
      const res = await api.post(`/pacientes/solicitar-turno`, {
        paciente_id: admin.id,
        medico_id: medico,
        especialidad_id: seleccionada,
        fecha,
        hora,
        detalles: detalles || "Asignado por administrador",
      });

      setMensaje(res.data.mensaje || "Turno solicitado correctamente.");
      setDetalles("");
      setHora("");
      cargarTurnos();
    } catch (err) {
      console.error("Error al solicitar turno:", err);
      setError(err.response?.data?.mensaje || "Error al solicitar el turno.");
    }
  };

  // Cancelar turno
  const cancelarTurno = async (turnoId) => {
    try {
      await api.put(`/admin/cancelar-turno/${turnoId}`);
      setMensaje("Turno cancelado correctamente.");
      cargarTurnos();
    } catch {
      setError("Error al cancelar turno.");
    }
  };

  //Formularios
  const buscarFormularios = async () => {
    try {
      const res = await api.get(`/admin/formularios`, {
        params: { nombre_completo: filtroNombre, medico_email: filtromedicoEmail },
      });
      setFormularios(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Error al buscar formularios.");
    }
  };


  //Render
  return (
    <div className="container">
      <LogoutButton />

      <h2>Panel de Administración</h2>
      <h4>Bienvenido/a, {admin?.nombre}</h4>

      <div className="tab-nav">
        <button
          onClick={() => setActiveTab("turnos")}
          className={activeTab === "turnos" ? "active" : ""}
        >
          Turnos
        </button>
        <button
          onClick={() => setActiveTab("formularios")}
          className={activeTab === "formularios" ? "active" : ""}
        >
          Formularios
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={activeTab === "chat" ? "active" : ""}
        >
          Chat
        </button>
      </div>

      {/* CHAT */}
      {activeTab === "chat" && (
        <div className="chat-tab">
          <h3>Chat con Pacientes</h3>
          <div className="chat-layout">
            <div className="chat-list">
              <h4>Conversaciones</h4>
              {pacientesChat.length === 0 ? (
                <p>No hay conversaciones activas.</p>
              ) : (
                <ul>
                  {pacientesChat.map((chat) => (
                    <li
                      key={chat.conversacion_id}
                      onClick={() =>
                        setPacienteSeleccionado({
                          id: chat.paciente_id,
                          nombre: chat.paciente_nombre || "Paciente",
                          tipo: "paciente",
                          conversacion_id: chat.conversacion_id,
                        })
                      }
                      className={`chat-item ${
                        pacienteSeleccionado?.id === chat.paciente_id
                          ? "active"
                          : ""
                      }`}
                    >
                      <strong>{chat.paciente_nombre || "Paciente"}</strong>
                      <p className="chat-preview">
                        {chat.ultimo_mensaje || "Sin mensajes"}
                      </p>
                      <small style={{ color: "#777" }}>
                        {chat.admin_nombre
                          ? `Atendido por ${chat.admin_nombre}`
                          : "Sin asignar"}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="chat-panel">
              {pacienteSeleccionado ? (
                <Chat
                  usuario={{ id: admin.id, nombre: admin.nombre, tipo: "admin" }}
                  receptor={{
                    id: pacienteSeleccionado.id,
                    nombre: pacienteSeleccionado.nombre,
                    tipo: "paciente",
                  }}
                  conversacionId={pacienteSeleccionado.conversacion_id}
                />
              ) : (
                <p>Seleccioná un paciente para chatear.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TURNOS */}
      {activeTab === "turnos" && (
        <>
          <h3>Solicitar Turno para Paciente</h3>

          <label>Especialidad:</label>
          <select value={seleccionada} onChange={handleEspecialidad}>
            <option value="">Seleccionar</option>
            {especialidades.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>

          <label>Médico:</label>
          <select value={medico} onChange={handleMedico}>
            <option value="">Seleccionar</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre} {m.apellido}
              </option>
            ))}
          </select>

          <label>Fecha:</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />

          <label>Hora:</label>
          <select value={hora} onChange={(e) => setHora(e.target.value)}>
            <option value="">Seleccionar</option>
            {bloquesDisponiblesAdmin().map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <label>Detalles:</label>
          <textarea
            rows="3"
            value={detalles}
            onChange={(e) => setDetalles(e.target.value)}
          />

          <button onClick={solicitarTurno}>Solicitar Turno</button>

          <hr />
          <h3>Turnos Registrados</h3>

          {turnos.length === 0 ? (
            <p>No hay turnos registrados.</p>
          ) : (
            <table border="1" cellPadding="8">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Estado</th>
                  <th>Médico</th>
                  <th>Especialidad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {turnos.map((t) => (
                  <tr key={t.id}>
                    <td>{t.fecha?.slice(0, 10)}</td>
                    <td>{t.hora}</td>
                    <td>{t.estado}</td>
                    <td>
                      {t.nombre_medico || "—"} {t.apellido_medico || ""}
                    </td>
                    <td>{t.especialidad || "—"}</td>
                    <td>
                      {["en espera", "confirmado"].includes(t.estado) && (
                        <button onClick={() => cancelarTurno(t.id)}>
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* FORMULARIOS */}
      {activeTab === "formularios" && (
        <div>
          <h3>Buscar Formularios</h3>
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
        </div>
      )}

      {mensaje && <p className="ok-msg">{mensaje}</p>}
      {error && <p className="err-msg">{error}</p>}
    </div>
  );
}

export default AdminDashboard;

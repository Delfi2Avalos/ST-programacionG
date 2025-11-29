import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MapaClinica from "../components/MapaClinica";
import Chat from "../components/chat.jsx";
import { socket } from "../components/socket.js";
import LogoutButton from "../components/LogoutButton";
import api from "../components/axios";

function PacienteDashboard() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const paciente =
    state?.usuario || JSON.parse(localStorage.getItem("usuario") || "null");

  const [activeTab, setActiveTab] = useState("turnos");

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
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [horariosMedico, setHorariosMedico] = useState([]);
  const [horariosEdicion, setHorariosEdicion] = useState([]);
  const [horariosOcupados, setHorariosOcupados] = useState([]);
  const [editarTurnoId, setEditarTurnoId] = useState(null);

  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHora, setNuevaHora] = useState("");

  const [obraSocial, setObraSocial] = useState(paciente?.obra_social || "");
  const [nuevaPassword, setNuevaPassword] = useState("");

  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [conversacionActiva, setConversacionActiva] = useState(null);

  useEffect(() => {
    if (!paciente?.id) {
      alert("Sesión no válida. Por favor, iniciá sesión nuevamente.");
      navigate("/");
    }
  }, [paciente?.id, navigate]);


  useEffect(() => {
    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket desconectado en paciente:", reason);
    });
    return () => socket.off("disconnect");
  }, []);


  const cargarTurnos = useCallback(async () => {
    try {
      const res = await api.get(`/pacientes/turnos/${paciente.id}`);
      setTurnos(res.data);
    } catch {
      setError("Error al cargar turnos.");
    }
  }, [paciente?.id]);

  useEffect(() => {
    if (paciente?.id) cargarTurnos();
  }, [paciente?.id, cargarTurnos]);


  const handleEspecialidad = async (e) => {
    const id = e.target.value;
    setSeleccionada(id);
    setMedicos([]);
    setMedico("");
    setFecha("");
    setHora("");
    setHorariosMedico([]);
    setHorariosOcupados([]);

    try {
      const res = await api.get(`/admin/medicos-por-especialidad/${id}`);
      setMedicos(res.data);
    } catch {
      setError("Error al cargar médicos.");
    }
  };


  const handleMedico = async (e) => {
    const id = e.target.value;
    setMedico(id);
    setFecha("");
    setHora("");
    setHorariosOcupados([]);

    try {
      const res = await api.get(`/medicos/horarios/${id}`);
      setHorariosMedico(res.data);
    } catch {
      setError("Error al cargar horarios.");
    }
  };


  useEffect(() => {
    if (fecha && medico) {
      api
        .get(`/medicos/ocupados/${medico}/${fecha}`)
        .then((res) =>
          setHorariosOcupados(Array.isArray(res.data) ? res.data : [])
        )
        .catch(() => console.error("Error al obtener horas ocupadas"));
    }
  }, [fecha, medico]);


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

  const generarBloques = (inicio, fin) => {
    const bloques = [];
    const [hInicio, mInicio] = inicio.split(":").map(Number);
    const [hFin, mFin] = fin.split(":").map(Number);
    let h = hInicio,
      m = mInicio;

    while (h < hFin || (h === hFin && m < mFin)) {
      const horaStr = `${h.toString().padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}`;
      bloques.push(horaStr);
      m += 30;
      if (m >= 60) {
        m -= 60;
        h++;
      }
    }
    return bloques;
  };

  const bloquesDisponibles = () => {
    if (!fecha || horariosMedico.length === 0) return [];

    const dia = obtenerDiaSemana(fecha);
    const normalizar = (s) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const horariosDia = horariosMedico.filter(
      (h) => normalizar(h.dia_semana) === normalizar(dia)
    );

    let bloques = [];
    horariosDia.forEach(
      (h) => (bloques = bloques.concat(generarBloques(h.hora_inicio, h.hora_fin)))
    );

    return bloques.filter((b) => !horariosOcupados.includes(b));
  };


const solicitarTurno = async () => {
  if (!paciente?.id) return setError("Sesión inválida.");
  if (!hora) return setError("Seleccioná una hora disponible.");
  if (!fecha) return setError("Seleccioná una fecha.");

  // Fecha de hoy (sin hora)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Fecha seleccionada por el usuario
  const fechaSel = new Date(fecha + "T00:00:00");
  const soloFechaSel = new Date(fechaSel);
  soloFechaSel.setHours(0, 0, 0, 0);

  // Fecha pasada
  if (soloFechaSel < hoy) {
    return setError("No podés solicitar turnos en fechas anteriores a hoy.");
  }

  // Si la fecha es hoy, validar la hora
  if (soloFechaSel.getTime() === hoy.getTime()) {
    const ahora = new Date();
    const [h, m] = hora.split(":").map(Number);

    if (h < ahora.getHours() || (h === ahora.getHours() && m <= ahora.getMinutes())) {
      return setError("Esta hora ya pasó. Elegí otro horario.");
    }
  }

  try {
    await api.post(`/pacientes/solicitar-turno`, {
      paciente_id: paciente.id,
      medico_id: medico,
      especialidad_id: seleccionada,
      fecha,
      hora,
      detalles,
    });

    setMensaje("Turno solicitado correctamente.");
    setHora("");
    setDetalles("");
    await cargarTurnos();

    setTimeout(() => setMensaje(""), 3000);

  } catch {
    setError("Error al solicitar turno.");
  }
};

  // Chat en tiempo real (mensajes y nuevas conversaciones)
useEffect(() => {
  if (paciente?.id && activeTab === "chat") {
    const cargar = () => {
      api
        .get(`/chat/usuario/${paciente.id}`)
        .then((res) => {
          // Buscamos conversación abierta (o la más reciente)
          const conversacion =
            res.data.find((c) => c.estado === "abierta") || res.data[0] || null;
          setConversacionActiva(conversacion);
        })
        .catch(() => console.error("Error al cargar la conversación."));
    };

    cargar();

    // Escuchar mensajes nuevos
    const handleNuevoMensaje = (msg) => {
      if (
        msg.receptor_id === paciente.id ||
        msg.emisor_id === paciente.id ||
        msg.conversacion_id === conversacionActiva?.conversacion_id
      ) {
        cargar();
      }
    };

    // Escuchar creación de nuevas conversaciones
    const handleNuevaConversacion = (conv) => {
      if (conv.paciente_id === paciente.id) cargar();
    };

    socket.on("nuevoMensaje", handleNuevoMensaje);
    socket.on("nuevaConversacion", handleNuevaConversacion);

    return () => {
      socket.off("nuevoMensaje", handleNuevoMensaje);
      socket.off("nuevaConversacion", handleNuevaConversacion);
    };
  }
}, [activeTab, paciente?.id, conversacionActiva?.conversacion_id]);


// Edición de turnos

const iniciarEdicion = async (turno) => {
  setEditarTurnoId(turno.id);
  setNuevaFecha(turno.fecha.split("T")[0]);
  setNuevaHora(turno.hora);

  try {
    const res = await api.get(`/medicos/horarios/${turno.medico_id}`);
    setHorariosEdicion(res.data);
  } catch {
    console.error("Error al obtener horarios.");
  }
};

// Generar bloques disponibles para edición
const bloquesEdicion = () => {
  if (!nuevaFecha || horariosEdicion.length === 0) return [];

  // Fecha de hoy (sin hora)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Fecha seleccionada (sin hora)
  const fechaSel = new Date(nuevaFecha + "T00:00:00");
  const soloFechaSel = new Date(fechaSel);
  soloFechaSel.setHours(0, 0, 0, 0);

  // Si la fecha es anterior a hoy entonces no muestra turnos
  if (soloFechaSel < hoy) {
    return [];
  }

  // Día de la semana
  const dia = obtenerDiaSemana(nuevaFecha);

  const normalizar = (s) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const horariosDia = horariosEdicion.filter(
    (h) => normalizar(h.dia_semana) === normalizar(dia)
  );

  let bloques = [];
  horariosDia.forEach(
    (h) => (bloques = bloques.concat(generarBloques(h.hora_inicio, h.hora_fin)))
  );

  // Si la fecha es HOY → filtrar horas pasadas
  const ahora = new Date();
  if (soloFechaSel.getTime() === hoy.getTime()) {
    const horaActual = ahora.getHours();
    const minutoActual = ahora.getMinutes();

    bloques = bloques.filter((b) => {
      const [h, m] = b.split(":").map(Number);

      if (h > horaActual) return true;
      if (h === horaActual && m > minutoActual) return true;

      return false;
    });
  }

  return bloques.filter((b) => !horariosOcupados.includes(b));
};


//  Guardar turno editado (con validaciones)
const guardarCambiosTurno = async (id) => {
  if (!nuevaFecha || !nuevaHora) {
    return setError("Debes elegir una fecha y hora válida.");
  }

  // Fecha actual normalizada
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Fecha seleccionada
  const fechaSel = new Date(nuevaFecha + "T00:00:00");
  const soloFechaSel = new Date(fechaSel);
  soloFechaSel.setHours(0, 0, 0, 0);

  //  Fecha pasada
  if (soloFechaSel < hoy) {
    return setError("No podés mover el turno a una fecha anterior a hoy.");
  }

  //  Si es hoy, validar hora
  if (soloFechaSel.getTime() === hoy.getTime()) {
    const ahora = new Date();
    const [h, m] = nuevaHora.split(":").map(Number);

    if (h < ahora.getHours() || (h === ahora.getHours() && m <= ahora.getMinutes())) {
      return setError("Ese horario ya pasó, elegí otro.");
    }
  }

  try {
    await api.put(`/pacientes/turno/${id}`, { nuevaFecha, nuevaHora });
    setEditarTurnoId(null);
    await cargarTurnos();
    setMensaje("Turno modificado correctamente.");
    setTimeout(() => setMensaje(""), 3000);
  } catch {
    setError("Error al modificar el turno.");
  }
};


// Cancelar turno
const cancelarTurno = async (id) => {
  if (!window.confirm("¿Seguro que querés cancelar este turno?")) return;

  try {
    await api.patch(`/pacientes/turno/cancelar/${id}`);
    await cargarTurnos();
    setMensaje("Turno cancelado correctamente.");
    setTimeout(() => setMensaje(""), 3000);
  } catch {
    setError("Error al cancelar turno.");
  }
};

  // Actualizar perfil
  const actualizarPerfil = async (tipo) => {
    try {
      const body =
        tipo === "obra_social"
          ? { obra_social: obraSocial }
          : { nueva_contrasena: nuevaPassword };
      await api.put(`/pacientes/actualizar/${paciente.id}`, body);
      setMensaje("Datos actualizados correctamente.");
      setTimeout(() => setMensaje(""), 3000);
    } catch {
      setError("Error al actualizar el perfil.");
    }
  };

//RENDER
  return (
    <div className="container">
      <LogoutButton />
      <h2>
        Bienvenido/a, {paciente?.nombre} {paciente?.apellido}
      </h2>

      <div className="tab-nav">
        <button
          onClick={() => setActiveTab("turnos")}
          className={activeTab === "turnos" ? "active" : ""}
        >
          Turnos
        </button>
        <button
          onClick={() => setActiveTab("perfil")}
          className={activeTab === "perfil" ? "active" : ""}
        >
          Perfil
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={activeTab === "chat" ? "active" : ""}
        >
          Chat
        </button>
      </div>

{activeTab === "chat" && (
  <>
    <h3>Chat con Administración</h3>
    <Chat
      usuario={{
        id: paciente.id,
        nombre: paciente.nombre,
        tipo: "paciente",
      }}
      receptor={{
        id: conversacionActiva?.admin_id || null,
        nombre: conversacionActiva?.admin_nombre || "Administración",
        tipo: "admin",
      }}
      conversacionId={conversacionActiva?.conversacion_id || null}
    />
    {conversacionActiva?.admin_nombre && (
      <p style={{ color: "#555", fontStyle: "italic" }}>
        🟢 Atendido por {conversacionActiva.admin_nombre}
      </p>
    )}
  </>
)}

      {/* === TURNOS === */}
      {activeTab === "turnos" && (
        <>
          <h3>Solicitar Nuevo Turno</h3>
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
            {bloquesDisponibles().map((b) => (
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
          <h3>Mis Turnos</h3>
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
                  <td>
                    {editarTurnoId === t.id ? (
                      <input
                        type="date"
                        value={nuevaFecha}
                        onChange={(e) => setNuevaFecha(e.target.value)}
                      />
                    ) : (
                      t.fecha.split("T")[0]
                    )}
                  </td>
                  <td>
                    {editarTurnoId === t.id ? (
                      <select
                        value={nuevaHora}
                        onChange={(e) => setNuevaHora(e.target.value)}
                      >
                        <option value="">Seleccionar</option>
                        {bloquesEdicion().map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    ) : (
                      t.hora
                    )}
                  </td>
                  <td>{t.estado}</td>
                  <td>
                    {t.nombre_medico} {t.apellido_medico}
                  </td>
                  <td>{t.especialidad}</td>
                  <td>
                    {t.estado === "en espera" &&
                      (editarTurnoId === t.id ? (
                        <>
                          <button onClick={() => guardarCambiosTurno(t.id)}>
                            Guardar
                          </button>
                          <button onClick={() => setEditarTurnoId(null)}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => iniciarEdicion(t)}>
                            Modificar
                          </button>
                          <button onClick={() => cancelarTurno(t.id)}>
                            Cancelar
                          </button>
                        </>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* === PERFIL === */}
      {activeTab === "perfil" && (
        <>
          <h3>Actualizar Perfil</h3>
          <label>Obra Social:</label>
          <input
            type="text"
            value={obraSocial}
            onChange={(e) => setObraSocial(e.target.value)}
          />
          <button onClick={() => actualizarPerfil("obra_social")}>
            Actualizar Obra Social
          </button>

          <label>Nueva Contraseña:</label>
          <input
            type="password"
            value={nuevaPassword}
            onChange={(e) => setNuevaPassword(e.target.value)}
          />
          <button onClick={() => actualizarPerfil("password")}>
            Actualizar Contraseña
          </button>

          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <button
              onClick={() => setMostrarMapa(!mostrarMapa)}
              style={{
                backgroundColor: mostrarMapa ? "#28a745" : "#0078d7",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {mostrarMapa ? "Ocultar mapa" : "Ver Clínica"}
            </button>
          </div>
          {mostrarMapa && <MapaClinica />}
        </>
      )}

      {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default PacienteDashboard;

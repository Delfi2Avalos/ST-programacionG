import { useEffect, useState, useRef } from "react";
import api from "./axios.js";
import { socket } from "./socket.js";

function Chat({ usuario, receptor, conversacionId: propConversacionId }) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [conversacionId, setConversacionId] = useState(propConversacionId || null);
  const chatEndRef = useRef(null);

  // Cargar conversación actual
  useEffect(() => {
    let cancelado = false;

    const cargarConversacion = async () => {
      if (!usuario?.id) return;
      try {
        let convId = propConversacionId || conversacionId;

        // Si no hay ID, buscar conversaciones activas
        if (!convId) {
          const res = await api.get(`/chat/usuario/${usuario.id}`);
          if (Array.isArray(res.data) && res.data.length > 0) {
            let conv = null;
            if (usuario.tipo === "admin" && receptor?.id) {
              conv = res.data.find((c) => c.paciente_id === receptor.id);
            } else if (usuario.tipo === "paciente") {
              conv = res.data.find((c) => c.estado === "abierta") || res.data[0];
            }
            if (conv) {
              convId = conv.conversacion_id;
              if (!cancelado) setConversacionId(convId);
            }
          }
        }

        // Cargar mensajes si tenemos conversación
        if (convId && !cancelado) {
          const mensajesRes = await api.get(`/chat/mensajes/${convId}`);
          setMensajes(Array.isArray(mensajesRes.data) ? mensajesRes.data : []);
        }
      } catch (err) {
        console.error("Error al cargar conversación:", err);
      }
    };

    cargarConversacion();
    return () => { cancelado = true; };
  }, [usuario?.id, receptor?.id, propConversacionId]);

  // Escuchar mensajes en tiempo real
  useEffect(() => {
    if (!usuario?.id) return;

    const handleMensajeRecibido = (msg) => {
      if (msg.conversacion_id === conversacionId) {
        setMensajes((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on("mensaje_recibido", handleMensajeRecibido);
    return () => socket.off("mensaje_recibido", handleMensajeRecibido);
  }, [usuario?.id, conversacionId]);

  // ✉️ Enviar mensaje
  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    try {
      // Si no hay receptor asignado lo mandamos a “Administración general” lo que seria cualquier ADMIN que tome el chat
      const receptor_id_seguro = receptor?.id || null;
      const receptor_tipo_seguro = receptor?.tipo || "admin";

      const body = {
        emisor_id: usuario.id,
        emisor_tipo: usuario.tipo,
        mensaje: nuevoMensaje.trim(),
        receptor_id: receptor_id_seguro,
        receptor_tipo: receptor_tipo_seguro,
        conversacion_id: conversacionId || null, //aseguramos ID coherente para que el admin lo asigne al tomar el NULL
      };

      const res = await api.post(`/chat/enviar`, body);
      const mensajeNuevo = res.data;

      // Si la conversación es nueva, guardamos su ID
      if (!conversacionId && mensajeNuevo.conversacion_id) {
        setConversacionId(mensajeNuevo.conversacion_id);
      }

      setMensajes((prev) => {
        if (prev.some((m) => m.id === mensajeNuevo.id)) return prev;
        return [...prev, mensajeNuevo];
      });

      setNuevoMensaje("");
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    }
  };

  // Mantener scroll abajo
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  // Interfaz del chat
  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>{receptor?.nombre || "Administración"}</h3>
      </div>

      <div className="chat-box">
        {mensajes.length === 0 ? (
          <p>No hay mensajes todavía.</p>
        ) : (
          mensajes.map((m) => (
            <div
              key={m.id}
              className={`mensaje ${
                m.emisor_id === usuario.id ? "propio" : "ajeno"
              }`}
            >
              <div className="mensaje-info">
                <strong>
                  {m.emisor_tipo === "admin"
                    ? "Admin"
                    : m.emisor_nombre || "Paciente"}
                </strong>
                <span className="hora">
                  {new Date(m.fecha_envio).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p>{m.mensaje}</p>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {["admin", "paciente"].includes(usuario.tipo) && (
        <form onSubmit={enviarMensaje} className="chat-input">
          <input
            type="text"
            placeholder="Escribí un mensaje..."
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
          />
          <button type="submit">Enviar</button>
        </form>
      )}
    </div>
  );
}

export default Chat;

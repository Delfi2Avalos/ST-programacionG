import { io } from "socket.io-client";
const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Token dinámico (para cada conexión)
const getToken = () => localStorage.getItem("token");

//Inicializamos el socket SIN conectar todavía
export const socket = io(SOCKET_URL, {
  autoConnect: false, //Evita conexión inmediata sin token
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

// Función para conectar con token válido

export const conectarSocket = () => {
  const token = getToken();
  if (!token) {
    console.warn("Intento de conectar socket sin token válido.");
    return;
  }
  socket.auth = { token };
  socket.connect();
};

// Actualizar token en reconexiones
socket.on("reconnect_attempt", () => {
  const token = getToken();
  socket.auth = { token };
});

// Eventos globales
socket.on("connect", () => {
  console.log("Conectado a Socket.IO:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("Error de conexión con Socket.IO:", err.message);

  if (err?.message?.includes("Token")) {
    console.warn("Token inválido o faltante, se requiere nuevo login.");
    localStorage.removeItem("token");
    socket.disconnect();
  }
});

socket.on("disconnect", (reason) => {
  console.log("Desconectado del servidor de sockets:", reason);
});

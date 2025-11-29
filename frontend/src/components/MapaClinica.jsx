import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useState } from "react";

const iconoClinica = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2966/2966486.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// Componente para el mapa de la clínica
function MapaClinica() {
  const [direccion] = useState({
    nombre: "Clínica SaludTotal",
    ubicacion: "3 de Junio, Goya, Corrientes, SALUD TOTAL ",
    coords: [-29.16745319885727, -59.259399093163026],
  });

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "1rem",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        marginTop: "1.5rem",
      }}
    >
      <h3 style={{ textAlign: "center", color: "#005c97" }}>Ubicación de la Clínica</h3>

      <div
        style={{
          height: "400px",
          width: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          marginTop: "1rem",
        }}
      >
        <MapContainer
          center={direccion.coords}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <Marker position={direccion.coords} icon={iconoClinica}>
            <Popup>
              <strong>{direccion.nombre}</strong>
              <br />
              {direccion.ubicacion}
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <button
          onClick={() =>
            window.open(
              `https://www.google.com/maps?q=${direccion.coords[0]},${direccion.coords[1]}`,
              "_blank"
            )
          }
          style={{
            backgroundColor: "#0078d7",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Ver en Google Maps
        </button>
      </div>
    </div>
  );
}

export default MapaClinica;

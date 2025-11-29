//Creamos un Logout para que el usuario pueda cerrar sesión y elimine el token almacenado

function LogoutButton() {
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/";
  };

  return (
    <div style={{ textAlign: "right", marginBottom: "1rem" }}>
      <button
        onClick={handleLogout}
        style={{
          backgroundColor: "#e63946",
          color: "white",
          border: "none",
          padding: "8px 14px",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
          transition: "0.2s ease",
        }}
        onMouseOver={(e) => (e.target.style.backgroundColor = "#c1121f")}
        onMouseOut={(e) => (e.target.style.backgroundColor = "#e63946")}
      >
        Cerrar sesión
      </button>
    </div>
  );
}

export default LogoutButton;

import { useState } from "react";
import { auth, db, provider } from "./firebase";
import { signInWithPopup } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { useNavigate } from "react-router-dom";

const ADMIN_EMAIL = "thefenixrise@gmail.com";

// Tabla de títulos según nivel
const TITULOS = {
  1: "prospecto",
  6: "novato",
  11: "ciudadano",
  16: "deliberante",
  21: "soberano"
};

function App() {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState("");
  const [titulo, setTitulo] = useState("");
  const navigate = useNavigate();

  // Función para determinar título según nivel
  const calcularTitulo = (nivel) => {
    let actual = "prospecto";
    for (let n in TITULOS) {
      if (nivel >= parseInt(n)) actual = TITULOS[n];
    }
    return actual;
  };

  // Función principal de login y creación de usuario
  const manejarLogin = async () => {
    try {
      const resultado = await signInWithPopup(auth, provider);
      const user = resultado.user;
      const dbRef = ref(db, `usuarios/${user.uid}`);
      const snapshot = await get(dbRef);

      if (snapshot.exists()) {
        const datos = snapshot.val();
        setUsuario(datos);
        setRol(datos.rol);
        setTitulo(calcularTitulo(datos.nivel));
        navigate(datos.rol === "admin" ? "/admin" : "/usuario");
      } else {
        const nuevoRol = user.email === ADMIN_EMAIL ? "admin" : "usuario";

        // Crear historialAgora vacío por niveles
        const historialAgoraInicial = {};
        for (let i = 1; i <= 10; i++) {
          historialAgoraInicial[`nivel${i}`] = {};
        }

        // Estructura completa del nuevo usuario
        const nuevoUsuario = {
          correo: user.email,
          nombre: user.displayName || "Sin nombre",
          foto: user.photoURL || "",
          rol: nuevoRol,
          nivel: 1,
          experiencia: 0,
          titulo: "prospecto",
          historialAgora: historialAgoraInicial
        };

        // Prevención de escritura vacía en Firebase
        if (nuevoUsuario && nuevoUsuario.correo) {
          try {
            await set(dbRef, nuevoUsuario);
            console.log("✅ Usuario creado:", JSON.stringify(nuevoUsuario, null, 2));
            const confirm = await get(dbRef);
            console.log("🔍 Verificación en Firebase:", confirm.val());
          } catch (err) {
            console.error("❌ Error al guardar usuario en Firebase:", err);
            alert("Error al guardar en Firebase: " + err.message);
          }
        } else {
          console.error("❌ Objeto nuevoUsuario está vacío o malformado");
        }

        setUsuario(nuevoUsuario);
        setRol(nuevoRol);
        setTitulo("prospecto");
        navigate(nuevoRol === "admin" ? "/admin" : "/usuario");
      }
    } catch (error) {
      alert("Error al iniciar sesión: " + error.message);
    }
  };

  return (
    <div style={estilos.fondo}>
      <div style={estilos.caja}>
        <img src="/logo.png" alt="Logo" style={estilos.logo} />
        <button onClick={manejarLogin} style={estilos.boton}>
          Civilízate
        </button>
      </div>
    </div>
  );
}

const estilos = {
  fondo: {
    backgroundColor: "#000",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: "5vh"
  },
  caja: {
    backgroundColor: "transparent",
    padding: 30,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  logo: {
    width: "100vw",
    maxWidth: 650,
    height: "auto",
    marginBottom: 30
  },
  boton: {
    padding: "14px 32px",
    fontSize: 20,
    fontWeight: "bold",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    background: "linear-gradient(145deg, rgba(0,42,143,0.8), rgba(0,60,200,0.9))",
    color: "white",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(0, 42, 143, 0.4)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    transition: "all 0.3s ease-in-out"
  }
};

export default App;

import React, { useEffect, useState } from "react";
import { getDatabase, ref, get, onValue, set, remove } from "firebase/database";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import CartaPregunta from "../components/CartaPregunta";
import useNivelListener from "../hooks/useNivelListener";
import "../styles/fixedCanvas.css";

const baseWidth = 1920;
const baseHeight = 1080;

const Pro_Excale = 0.9;
const Pro_Xpos = 500;
const Pro_Ypos = -500;

const BT_Excale = 0.8;
const BT_Xpos = 400;
const BT_Ypos = -35;

const provincias = [
  { nombre: "ARTEMISA", left: 231, top: 813, width: 48, height: 41 },
  { nombre: "CAMAGUEY", left: 621, top: 909, width: 150, height: 131 },
  { nombre: "CIEGO DE AVILA", left: 575, top: 877, width: 92, height: 83 },
  { nombre: "CIENFUEGOS", left: 412, top: 861, width: 80, height: 71 },
  { nombre: "GRANMA", left: 693, top: 1035, width: 139, height: 93 },
  { nombre: "GUANTANAMOS", left: 903, top: 1047, width: 122, height: 68 },
  { nombre: "HABANA", left: 272, top: 801, width: 35, height: 21 },
  { nombre: "HOLGUIN", left: 787, top: 984, width: 180, height: 79 },
  { nombre: "LAS TUNAS", left: 687, top: 967, width: 133, height: 75 },
  { nombre: "MATANZA", left: 302, top: 805, width: 144, height: 107 },
  { nombre: "MAYABEQUE", left: 276, top: 801, width: 74, height: 59 },
  { nombre: "PINAR DEL RIO", left: 50, top: 817, width: 190, height: 118 },
  { nombre: "SANTIAGO", left: 759, top: 1051, width: 149, height: 69 },
  { nombre: "SANTIESPIRITUS", left: 487, top: 872, width: 102, height: 87 },
  { nombre: "VILLA CLARA", left: 429, top: 815, width: 122, height: 106 },
];

const UserPage = () => {
  const { currentUser } = useAuth();
  useNivelListener(currentUser?.uid);

  const [userData, setUserData] = useState(null);
  const [preguntaActual, setPreguntaActual] = useState(null);
  const [preguntasNivel, setPreguntasNivel] = useState([]);
  const [vidas, setVidas] = useState(3);
  const [experiencia, setExperiencia] = useState(0);
  const [mostrarCarta, setMostrarCarta] = useState(false);
  const [botonesActivos, setBotonesActivos] = useState(true);
  const [tiempoRestante, setTiempoRestante] = useState(30);
  const [buscandoRival, setBuscandoRival] = useState(false);
  const [matchPendiente, setMatchPendiente] = useState(null);
  const [ekklesiaActivado, setEkklesiaActivado] = useState(false);
  const [preguntasRespondidas, setPreguntasRespondidas] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const db = getDatabase();
    const usuarioRef = ref(db, `usuarios/${currentUser?.uid}`);
    const unsubscribe = onValue(usuarioRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserData(data);
        setExperiencia(data.experiencia || 0);
      } else {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!mostrarCarta && matchPendiente) {
      navigate("/ekklesia", { state: { match: matchPendiente } });
      setMatchPendiente(null);
    }
  }, [mostrarCarta, matchPendiente]);

  useEffect(() => {
    if (!currentUser) return;
    const db = getDatabase();
    const matchRef = ref(db, `ekklesia/matches/${currentUser.uid}`);

    const unsubscribe = onValue(matchRef, (snapshot) => {
      const matchData = snapshot.val();
      if (matchData && ekklesiaActivado) {
        if (!mostrarCarta) {
          navigate("/ekklesia", { state: { match: matchData } });
        } else {
          setMatchPendiente(matchData);
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser, mostrarCarta, ekklesiaActivado]);

  const iniciarAgora = async () => {
    if (!botonesActivos || !userData) return;
    setBotonesActivos(false);

    const db = getDatabase();
    const nivel = userData.nivel;
    const nivelDificultad = Math.max(nivel - 1, 0);
    const preguntasRef = ref(db, `niveles/${nivelDificultad}/preguntas`);
    const snapshot = await get(preguntasRef);
    const preguntas = snapshot.val();

    if (!preguntas) {
      alert("No hay preguntas para este nivel.");
      return;
    }

    const disponiblesRef = ref(db, `usuarios/${currentUser.uid}/Agora_Pdisponible`);
    const disponiblesSnap = await get(disponiblesRef);

    if (!disponiblesSnap.exists()) {
      const nuevosDisponibles = {};
      Object.values(preguntas).forEach((p) => {
        if (p.id) {
          nuevosDisponibles[p.id] = true;
        }
      });
      await set(disponiblesRef, nuevosDisponibles);
    }

    const disponiblesFinal = (await get(disponiblesRef)).val();
    let idsDisponibles = disponiblesFinal ? Object.keys(disponiblesFinal) : [];

    if (idsDisponibles.length === 0) {
      const fallosRef = ref(db, `usuarios/${currentUser.uid}/Agora_Pfallo`);
      const fallosSnap = await get(fallosRef);
      const fallos = fallosSnap.val();
      if (fallos) {
        idsDisponibles = Object.keys(fallos);
      } else {
        alert("No quedan más preguntas para este nivel.");
        return;
      }
    }

    const idSeleccionado = idsDisponibles[Math.floor(Math.random() * idsDisponibles.length)];
    const pregunta = Object.values(preguntas).find((p) => p.id === idSeleccionado);

    if (!pregunta) {
      alert("Error al cargar la pregunta.");
      return;
    }

    setPreguntasNivel(Object.values(preguntas));
    setPreguntaActual(pregunta);
    setPreguntasRespondidas([pregunta.id]);
    setMostrarCarta(true);
  };

  const iniciarEkklesia = async () => {
    if (!userData) return;
    setBuscandoRival(true);
    setEkklesiaActivado(true);

    const db = getDatabase();
    const esperaRef = ref(db, `ekklesia/esperandoEmparejamiento/${currentUser.uid}`);
    await set(esperaRef, {
      uid: currentUser.uid,
      nivel: userData.nivel,
      nombre: userData.nombre,
      timestamp: Date.now(),
    });

    const delay = Math.floor(Math.random() * 5000) + 5000;
    setTimeout(async () => {
      const matchId = `${currentUser.uid}_ficticio`;
      const matchRef = ref(db, `ekklesia/matches/${currentUser.uid}`);
      await set(matchRef, {
        jugador1: {
          uid: currentUser.uid,
          nombre: userData.nombre,
          nivel: userData.nivel,
        },
        jugador2: {
          uid: "ficticio",
          nombre: "Rival Ficticio",
          nivel: userData.nivel,
        },
        id: matchId,
      });
    }, delay);
  };

  const handleBotonGenerico = () => {
    if (!botonesActivos) {
      alert("Estás en medio de una pregunta. Pierdes una vida.");
      setVidas((prev) => Math.max(prev - 1, 0));
    }
  };

  if (!userData) {
    return (
      <div className="flex justify-center items-center h-screen bg-black text-white">
        Cargando...
      </div>
    );
  }

  return (
    <div className="fixed-canvas">
      <img src="/fondos/fondo-mar-ghibli.png" alt="Fondo" className="fixed-background" />
      <div className="canvas-inner">
        <div className="absolute top-6 w-full text-center z-20 text-white">
          <h1 className="text-3xl font-bold">Bienvenido, {userData.nombre}</h1>
          <p className="text-sm text-yellow-200 mt-1">
            Nivel {userData.nivel} | Título:{" "}
            <span className="capitalize">{userData.titulo}</span> | XP: {experiencia} | ❤️ Vidas: {vidas}
          </p>
          {buscandoRival && (
            <p className="mt-2 text-blue-300 font-semibold">
              🔍 Buscando emparejamiento para Ekklesia...
            </p>
          )}
        </div>

        {provincias.map((prov) => (
          <img
            key={prov.nombre}
            src={`/provincias/${prov.nombre}.png`}
            className="absolute z-10 cursor-pointer transition-transform duration-200 hover:scale-105"
            alt={prov.nombre}
            onClick={handleBotonGenerico}
            style={{
              top: prov.top * Pro_Excale + Pro_Ypos,
              left: prov.left * Pro_Excale + Pro_Xpos,
              width: prov.width * Pro_Excale,
              height: prov.height * Pro_Excale,
            }}
          />
        ))}

        <img
          src="/botones/bt_agora.png"
          onClick={iniciarAgora}
          className="absolute z-30 cursor-pointer transition-transform duration-200 hover:scale-105"
          alt="Ágora"
          style={{
            top: 270 * BT_Excale + BT_Ypos,
            left: 90 * BT_Excale + BT_Xpos,
            width: 130 * BT_Excale,
          }}
        />
                <img
          src="/botones/character/character1.png"
          onClick={handleBotonGenerico}
          className="absolute z-30 cursor-pointer transition-transform duration-200 hover:scale-105"
          alt="Character"
          style={{
            top: 50 * BT_Excale + BT_Ypos,
            left: 90 * BT_Excale + BT_Xpos,
            width: 150 * BT_Excale,
          }}
        />

        <img
          src="/botones/bt_ekklesia.png"
          alt="Ekklesia"
          className="absolute z-30 cursor-pointer transition-transform duration-200 hover:scale-105"
          onClick={iniciarEkklesia}
          style={{
            top: 470 * BT_Excale + BT_Ypos,
            left: 90 * BT_Excale + BT_Xpos,
            width: 130 * BT_Excale,
          }}
        />

        <img
          src="/botones/bt_demosynthesis.png"
          alt="Demosynthesis"
          className="absolute z-30 cursor-pointer transition-transform duration-200 hover:scale-105"
          onClick={handleBotonGenerico}
          style={{
            top: 690 * BT_Excale + BT_Ypos,
            left: 90 * BT_Excale + BT_Xpos,
            width: 130 * BT_Excale,
          }}
        />

        {mostrarCarta && (
          <CartaPregunta
            pregunta={preguntaActual}
            setPreguntaActual={setPreguntaActual}
            preguntasNivel={preguntasNivel}
            setVidas={setVidas}
            setExperiencia={setExperiencia}
            setMostrarCarta={setMostrarCarta}
            tiempoRestante={tiempoRestante}
            setTiempoRestante={setTiempoRestante}
            setBotonesActivos={setBotonesActivos}
            preguntasRespondidas={preguntasRespondidas}
            setPreguntasRespondidas={setPreguntasRespondidas}
          />
        )}
      </div>
    </div>
  );
};

export default UserPage;

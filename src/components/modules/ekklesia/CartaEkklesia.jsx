import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { useAuth } from "../../../AuthContext";

const CartaEkklesia = ({ partidaId }) => {
  const { currentUser } = useAuth();
  const db = getDatabase();

  const [carta, setCarta] = useState(null);
  const [pregunta, setPregunta] = useState(null);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState(null);
  const [estadoTurno, setEstadoTurno] = useState("");
  const [rolJugador, setRolJugador] = useState("");
  const [respuestaExistente, setRespuestaExistente] = useState(false);
  const [tiempo, setTiempo] = useState(30);
  const [cierredeturno, setCierreDeTurno] = useState(null); // 🔒 Nuevo estado

  useEffect(() => {
    if (!currentUser?.uid || !partidaId) return;

    const partidaRef = ref(db, `emparejamientos/partidas/${partidaId}`);
    return onValue(partidaRef, (snapshot) => {
      const data = snapshot.val();

      const cartaData = data?.cartaekklesiavisible;
      if (cartaData?.id) {
        setCarta(cartaData);
      } else {
        setCarta(null);
      }

      setEstadoTurno(data?.estadoTurno || "");
      setCierreDeTurno(data?.cierredeturno ?? null); // ✅ Escuchar cierre

      const rol = data?.rol?.[currentUser.uid];
      setRolJugador(rol || "");

      const turno = data?.estadoTurno?.split("-")[0];
      const respuestaActual =
        data?.respuesta?.[`cartajugada${turno}`]?.[rol] || null;
      setRespuestaExistente(!!respuestaActual);
    });
  }, [db, partidaId, currentUser]);

  useEffect(() => {
    setRespuestaSeleccionada(null);
    setTiempo(30);
  }, [estadoTurno, carta?.id]);

  useEffect(() => {
    if (!carta?.id) return;

    const [nivelParte] = carta.id.replace("Agora_n", "").split("p");
    const nivel = parseInt(nivelParte);
    const preguntasRef = ref(db, `niveles/${nivel}/preguntas`);

    return onValue(preguntasRef, (snapshot) => {
      const preguntas = snapshot.val();
      if (!preguntas) return;

      const preguntaEncontrada = Object.values(preguntas).find(
        (p) => p.id === carta.id
      );
      setPregunta(preguntaEncontrada || null);
    });
  }, [carta]);

  useEffect(() => {
    if (!carta || !carta.id || respuestaExistente || cierredeturno !== null) return;
    const intervalo = setInterval(() => {
      setTiempo((prev) => {
        if (prev === 1) {
          manejarFalloAutomatico();
          clearInterval(intervalo);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalo);
  }, [carta, respuestaExistente, cierredeturno]);

  const manejarFalloAutomatico = async () => {
    if (!estadoTurno || !rolJugador || respuestaExistente || cierredeturno !== null) return;
    const [turnoStr] = estadoTurno.split("-");
    const respuestaRef = ref(
      db,
      `emparejamientos/partidas/${partidaId}/respuesta/cartajugada${turnoStr}/${rolJugador}`
    );
    await set(respuestaRef, "fallo");
    setRespuestaSeleccionada(null); // 🧹 Limpieza tras fallo automático
  };

  const handleRespuesta = async (opcion) => {
    if (!pregunta || !estadoTurno || respuestaExistente || cierredeturno !== null) return;
    const [turnoStr] = estadoTurno.split("-");
    const respuestaRef = ref(
      db,
      `emparejamientos/partidas/${partidaId}/respuesta/cartajugada${turnoStr}/${rolJugador}`
    );
    const valor = opcion === pregunta.correcta ? "acierto" : "fallo";
    await set(respuestaRef, valor);
    setRespuestaSeleccionada(null); // 🧹 Limpieza inmediata después de responder
  };

  if (!carta?.id || !pregunta) return null;

  const bloqueado =
    carta.lanzadaPor === currentUser.uid ||
    respuestaSeleccionada ||
    respuestaExistente ||
    cierredeturno !== null; // 🔒 Evita que toque si hay cierre

  return (
    <div className="absolute top-[35%] left-1/2 w-[340px] min-h-[480px] -translate-x-1/2 -translate-y-1/2 bg-[#f9f4ed] border border-[#c7b79d] rounded-xl shadow-xl flex flex-col justify-between p-4 z-50">
      <div className="flex justify-between text-xs text-[#6b4d2d] font-semibold mb-2">
        <span>ID: {pregunta.id}</span>
        <span>+{pregunta.experiencia} XP</span>
      </div>

      <div className="text-[#6b4d2d] text-base font-semibold text-center leading-snug mb-2">
        {pregunta.pregunta}
      </div>

      <div className="flex flex-col gap-2">
        {["a", "b", "c", "d"].map((opcion) => (
          <button
            key={opcion}
            className={`text-sm px-3 py-2 rounded-md border transition duration-200 ease-in-out ${
              respuestaSeleccionada === opcion
                ? opcion === pregunta.correcta
                  ? "bg-green-600 text-white"
                  : "bg-gray-500 text-white"
                : "bg-white text-black border-gray-400 hover:bg-gray-100"
            } ${bloqueado ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => handleRespuesta(opcion)}
            disabled={bloqueado}
          >
            {pregunta[opcion]}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="text-xs text-gray-600 italic flex items-center gap-1">
          <span className="text-blue-400">⏳</span> {tiempo} segundos
        </div>
        <div className="text-xs text-gray-500 font-bold px-2 py-1 rounded bg-white border">
          {estadoTurno}
        </div>
      </div>
    </div>
  );
};

export default CartaEkklesia;


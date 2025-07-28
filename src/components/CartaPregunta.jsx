import React, { useEffect, useState } from "react";
import { getDatabase, ref, update, get, set } from "firebase/database";
import { useAuth } from "../AuthContext";

const CartaPregunta = ({
  pregunta,
  setPreguntaActual,
  preguntasNivel,
  setVidas,
  setExperiencia,
  setMostrarCarta,
  tiempoRestante,
  setTiempoRestante,
  setBotonesActivos,
  preguntasRespondidas,
  setPreguntasRespondidas,
}) => {
  const { currentUser } = useAuth();
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState(null);
  const [opcionesAleatorias, setOpcionesAleatorias] = useState([]);
  const db = getDatabase();

  useEffect(() => {
    if (tiempoRestante <= 0) {
      manejarRespuesta(null);
    }

    const timer = setInterval(() => {
      setTiempoRestante((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [tiempoRestante]);

  useEffect(() => {
    if (pregunta) {
      const claves = ["a", "b", "c", "d"].filter(
        (key) => pregunta?.[key]?.trim().length > 0
      );

      const mezcladas = claves
        .map((key) => ({ key, texto: pregunta[key].trim() }))
        .sort(() => Math.random() - 0.5);

      setOpcionesAleatorias(mezcladas);
    }
  }, [pregunta]);

  const moverIDEntreListas = async (id, fueCorrecta) => {
    const uid = currentUser.uid;
    const ahora = new Date().toISOString();
    const desde = ref(db, `usuarios/${uid}/Agora_Pdisponible/${id}`);
    const hacia = ref(db, `usuarios/${uid}/${fueCorrecta ? "Agora_Paciertos" : "Agora_Pfallo"}/${id}`);

    await set(hacia, { fecha: ahora });
    await set(desde, null);
  };

  const actualizarFirebase = async (fueCorrecta) => {
    const uid = currentUser.uid;
    const expRef = ref(db, `usuarios/${uid}/experiencia`);
    const nivelRef = ref(db, `usuarios/${uid}/nivel`);

    if (fueCorrecta) {
      const experienciaGanada = pregunta.experiencia || 0;
      const expSnap = await get(expRef);
      const experienciaActual = expSnap.exists() ? expSnap.val() : 0;
      const nuevaExp = experienciaActual + experienciaGanada;

      await set(expRef, nuevaExp);

      const escaladoSnap = await get(ref(db, `escalado/niveles`));
      if (escaladoSnap.exists()) {
        const escalado = escaladoSnap.val();
        let nuevoNivel = 1;
        for (const [nivelStr, rango] of Object.entries(escalado)) {
          const nivelNum = parseInt(nivelStr);
          if (nuevaExp >= rango.min && nuevaExp <= rango.max) {
            nuevoNivel = nivelNum;
            break;
          }
        }

        const nivelSnap = await get(nivelRef);
        const nivelActual = nivelSnap.exists() ? nivelSnap.val() : 1;

        if (nuevoNivel !== nivelActual) {
          await set(nivelRef, nuevoNivel);
          await set(ref(db, `usuarios/${uid}/Agora_Pdisponible`), null);
          await set(ref(db, `usuarios/${uid}/Agora_Paciertos`), null);
          await set(ref(db, `usuarios/${uid}/Agora_Pfallo`), null);
          alert("¡Felicidades! Has subido de nivel. Las preguntas se han reiniciado para tu nuevo nivel.");
          cerrarCarta();
          return;
        }
      }
    } else {
      const vidasRef = ref(db, `usuarios/${uid}/vidas`);
      let vidasSnap = await get(vidasRef);
      let vidasActuales = vidasSnap.exists() ? vidasSnap.val() : 3;
      await set(vidasRef, Math.max(vidasActuales - 1, 0));
    }
  };

  const buscarSiguientePregunta = async () => {
    const uid = currentUser.uid;
    const nivel = pregunta.id.match(/n(\d+)p\d+/)?.[1];
    const disponibleRef = ref(db, `usuarios/${uid}/Agora_Pdisponible`);
    const fallbackRef = ref(db, `usuarios/${uid}/Agora_Pfallo`);

    let snapshot = await get(disponibleRef);
    let lista = snapshot.exists() ? Object.keys(snapshot.val()) : [];

    if (lista.length === 0) {
      const fallbackSnap = await get(fallbackRef);
      lista = fallbackSnap.exists() ? Object.keys(fallbackSnap.val()) : [];
    }

    if (lista.length === 0) {
      alert("No quedan más preguntas disponibles ni fallidas para este nivel.");
      cerrarCarta();
      return;
    }

    const idSeleccionado = lista[Math.floor(Math.random() * lista.length)];
    const preguntasRef = ref(db, `niveles/${nivel}/preguntas`);
    const preguntasSnap = await get(preguntasRef);
    const todas = preguntasSnap.val();

    const nueva = Object.values(todas).find((p) => p.id === idSeleccionado);
    if (!nueva) {
      alert("No se pudo cargar la siguiente pregunta.");
      cerrarCarta();
      return;
    }

    setPreguntaActual(nueva);
    setRespuestaSeleccionada(null);
    setTiempoRestante(30);
  };

  const manejarRespuesta = async (opcion) => {
    if (respuestaSeleccionada !== null) return;

    setRespuestaSeleccionada(opcion);

    const correcta = pregunta?.correcta?.trim().toLowerCase();
    const seleccionada = opcion?.trim().toLowerCase();
    const fueCorrecta = seleccionada === correcta;

    await actualizarFirebase(fueCorrecta);
    await moverIDEntreListas(pregunta.id, fueCorrecta);

    setTimeout(() => {
      buscarSiguientePregunta();
    }, 2000);
  };

  const cerrarCarta = () => {
    setMostrarCarta(false);
    setBotonesActivos(true);
    setTiempoRestante(30);
  };

  const sinRespuestas = opcionesAleatorias.length === 0;

  return (
    <div className="absolute bottom-[10%] left-1/2 transform -translate-x-1/2 z-50">
      <div className="relative w-[320px] bg-[#fffaf0] rounded-[1.5rem] shadow-[0_10px_25px_rgba(0,0,0,0.25)] border-4 border-[#c2a67e] p-5 font-serif">

        <div className="absolute top-2 left-4 text-sm font-bold text-gray-600">
          ID: {pregunta.id}
        </div>

        <div className="absolute top-2 right-4 text-sm font-bold text-yellow-800">
          +{pregunta.experiencia || 0} XP
        </div>

        <div className="text-center text-base font-semibold text-[#5c3a1e] mb-4">
          {pregunta.pregunta || "Pregunta no disponible"}
        </div>

        {sinRespuestas ? (
          <div className="text-center text-red-700 font-semibold">
            ⚠️ Esta pregunta no tiene respuestas válidas. Pulsa cerrar para continuar.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {opcionesAleatorias.map(({ key, texto }) => {
              const correcta = pregunta.correcta?.trim().toLowerCase();
              const seleccionada = respuestaSeleccionada?.trim().toLowerCase();

              let estilo = "bg-white hover:bg-yellow-100 border-gray-400";
              if (respuestaSeleccionada) {
                if (texto.toLowerCase() === correcta) {
                  estilo = "bg-green-300 border-green-700";
                } else if (texto.toLowerCase() === seleccionada) {
                  estilo = "bg-red-300 border-red-700";
                } else {
                  estilo = "bg-gray-200 border-gray-300";
                }
              }

              return (
                <button
                  key={key}
                  onClick={() => manejarRespuesta(texto)}
                  disabled={!!respuestaSeleccionada}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold border-2 transition-colors duration-300 ${estilo}`}
                >
                  {texto}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center mt-5">
          <span className="text-sm text-gray-600">⏳ {tiempoRestante} segundos</span>
          <button
            onClick={cerrarCarta}
            className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartaPregunta;


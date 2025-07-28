import React, { useEffect, useState } from "react";
import { getDatabase, ref, get, set } from "firebase/database";
import { useAuth } from "@/AuthContext";
import EkklesiaModule from "@/components/modules/ekklesia/EkklesiaModule";
import CartaEkklesia from "@/components/modules/ekklesia/CartaEkklesia";
import BotEkklesia from "@/components/modules/ekklesia/BotEkklesia";
import JuezEkklesia from "@/components/modules/ekklesia/JuezEkklesia";

const Ekklesia = () => {
  const { currentUser } = useAuth();
  const [jugador, setJugador] = useState(null);
  const [partidaId, setPartidaId] = useState(null);
  const [cargando, setCargando] = useState(true);

  const asignarCartasSinRepetir = (ids, cantidad) => {
    const seleccionadas = [];
    while (seleccionadas.length < cantidad && ids.length > 0) {
      const index = Math.floor(Math.random() * ids.length);
      seleccionadas.push(ids[index]);
      ids.splice(index, 1);
    }
    return seleccionadas;
  };

  useEffect(() => {
    if (!currentUser) return;

    const db = getDatabase();
    const userRef = ref(db, `usuarios/${currentUser.uid}`);

    get(userRef).then((snap) => {
      if (!snap.exists()) {
        console.error("Usuario no encontrado");
        setCargando(false);
        return;
      }

      const userData = { ...snap.val(), uid: currentUser.uid };
      setJugador(userData);

      const partidaRef = ref(db, `emparejamientos/jugadores/${currentUser.uid}/partida`);

      get(partidaRef).then((partidaSnap) => {
        if (!partidaSnap.exists()) {
          const partidaFakeId = `bot-vs-${currentUser.uid}`;
          const nivelPregunta = Math.max(userData.nivel - 1, 0);
          const preguntasRef = ref(db, `niveles/${nivelPregunta}/preguntas`);

          get(preguntasRef).then((preguntasSnap) => {
            if (!preguntasSnap.exists()) {
              console.error("No hay preguntas para el nivel", nivelPregunta);
              setCargando(false);
              return;
            }

            const preguntas = Object.values(preguntasSnap.val()).filter(p => p.id);
            const ids = preguntas.map(p => p.id);
            const mezcladas = [...ids];

            const cartasJugador = asignarCartasSinRepetir(mezcladas, 5);
            const cartasBot = asignarCartasSinRepetir(mezcladas, 5);
            const ekklesiaDisponible = asignarCartasSinRepetir(mezcladas, 10);

            const partidaPath = ref(db, `emparejamientos/partidas/${partidaFakeId}`);
            set(partidaPath, {
              jugador1: currentUser.uid,
              jugador2: "ficticio",
              nivel: userData.nivel,
              estado: "activa",
              estadoTurno: "1-1",
              cartas: {
                [currentUser.uid]: cartasJugador,
                ficticio: cartasBot
              },
              ekklesia_pdisponible: ekklesiaDisponible,
              descartes: { [currentUser.uid]: 0 },
              // ⚠️ Aquí se escribe la variable como lo pediste
              cierredeturno: null
            }).then(() => {
              set(ref(db, `emparejamientos/jugadores/${currentUser.uid}`), {
                partida: partidaFakeId,
                rival: "ficticio"
              }).then(() => {
                setPartidaId(partidaFakeId);
                setCargando(false);
              });
            });
          });
        } else {
          const pid = partidaSnap.val();
          const partidaPath = ref(db, `emparejamientos/partidas/${pid}`);

          get(partidaPath).then((partidaDataSnap) => {
            if (!partidaDataSnap.exists()) {
              console.error("Partida existente no encontrada:", pid);
              setCargando(false);
              return;
            }

            setPartidaId(pid);
            setCargando(false);
          });
        }
      });
    });
  }, [currentUser]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-black text-white text-xl">
        Cargando emparejamiento...
      </div>
    );
  }

  if (!partidaId || !jugador) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-black text-white text-center text-lg px-4">
        No estás emparejado actualmente para una partida de Ekklesia.
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="relative aspect-[9/16] h-full max-h-screen max-w-screen bg-gradient-to-b from-zinc-900 to-black rounded-md shadow-lg border-2 border-yellow-500 overflow-hidden">
        <EkklesiaModule partidaId={partidaId} jugador={jugador} />
        <BotEkklesia partidaId={partidaId} />
        <CartaEkklesia partidaId={partidaId} jugador={jugador} />
      </div>
      <JuezEkklesia partidaId={partidaId} jugador={jugador} />
    </div>
  );
};

export default Ekklesia;


import { useEffect, useState } from "react";
import { getDatabase, ref, get, set, onValue, remove } from "firebase/database";
import { useNavigate } from "react-router-dom";

const JuezEkklesia = ({ partidaId, jugador }) => {
  const [estadoTurnoTexto, setEstadoTurnoTexto] = useState(null);
  const [tiempoLanzamiento, setTiempoLanzamiento] = useState(null);
  const navigate = useNavigate();

useEffect(() => {
  const db = getDatabase();

  // 🟢 Lo primero: escribir cierredeturno en null siempre
  set(ref(db, `emparejamientos/partidas/${partidaId}/cierredeturno`), null);

    const respuestaRef = ref(db, `emparejamientos/partidas/${partidaId}/respuesta`);
    const cartaRef = ref(db, `emparejamientos/partidas/${partidaId}/cartaekklesiavisible`);
    const estadoTurnoRef = ref(db, `emparejamientos/partidas/${partidaId}/estadoTurno`);
    const cierreRef = ref(db, `emparejamientos/partidas/${partidaId}/cierredeturno`);
    const partidaPath = ref(db, `emparejamientos/partidas/${partidaId}`);

    let timeoutAutoCarta = null;

    const determinarEstadoTurno = (respuestas) => {
      for (let i = 1; i <= 10; i++) {
        const jugada = respuestas[`cartajugada${i}`];
        if (!jugada) return { turno: i, ronda: 1 };
        const { desafiado, desafiante } = jugada;
        if (desafiado === "acierto") continue;
        if (desafiado === "fallo" && !desafiante) return { turno: i, ronda: 2 };
        if (!desafiado) return { turno: i, ronda: 1 };
      }
      return { turno: 11, ronda: 1 };
    };

    const limpiarFinalPartida = async () => {
      const paths = ["cartaekklesiavisible", "respuesta", "cartas", "roles", "rol", "xp", "descartes"];
      for (const path of paths) {
        await remove(ref(db, `emparejamientos/partidas/${partidaId}/${path}`));
      }
    };

    const entregarPuntosYFinalizar = async (turno, xp) => {
      await set(cierreRef, true); // 🛑 Cierre iniciado

      await new Promise((r) => setTimeout(r, 2000));

      const jugadaRef = ref(db, `emparejamientos/partidas/${partidaId}/respuesta/cartajugada${turno}`);
      const snap = await get(jugadaRef);
      const jugada = snap.val() || {};

      const { desafiado, desafiante, uidDesafiado, uidDesafiante } = jugada;
      if (!uidDesafiado || !uidDesafiante || uidDesafiado === uidDesafiante) return;

      const refXPDesafiado = ref(db, `emparejamientos/partidas/${partidaId}/xp/${uidDesafiado}`);
      const refXPDesafiante = ref(db, `emparejamientos/partidas/${partidaId}/xp/${uidDesafiante}`);
      const xpDesafiado = (await get(refXPDesafiado)).val() || 0;
      const xpDesafiante = (await get(refXPDesafiante)).val() || 0;

      if (desafiado === "acierto") {
        await set(refXPDesafiado, xpDesafiado + xp);
        await set(refXPDesafiante, xpDesafiante - xp);
      }

      if (desafiado === "fallo" && (desafiante === "acierto" || desafiante === "fallo")) {
        const ganador = desafiante === "acierto" ? uidDesafiante : uidDesafiado;
        const perdedor = desafiante === "acierto" ? uidDesafiado : uidDesafiante;
        const refXPGanador = ref(db, `emparejamientos/partidas/${partidaId}/xp/${ganador}`);
        const refXPPerdedor = ref(db, `emparejamientos/partidas/${partidaId}/xp/${perdedor}`);
        const xpGanador = (await get(refXPGanador)).val() || 0;
        const xpPerdedor = (await get(refXPPerdedor)).val() || 0;
        await set(refXPGanador, xpGanador + xp);
        await set(refXPPerdedor, xpPerdedor - xp);
      }

      await remove(ref(db, `emparejamientos/partidas/${partidaId}/cartaekklesiavisible`));
      await remove(jugadaRef);

      const proximoTurno = turno + 1;

      if (proximoTurno > 10) {
        // 🟣 Calcular XP total de la partida para ambos jugadores
        const xpTotalSnap = await get(ref(db, `emparejamientos/partidas/${partidaId}/xp`));
        const xpTotal = xpTotalSnap.val() || {};

        const actualizarExperiencia = async (uid, delta) => {
          if (!uid || uid === "ficticio" || delta === 0) return;
          const userXPRef = ref(db, `usuarios/${uid}/experiencia`);
          const userNivelRef = ref(db, `usuarios/${uid}/nivel`);
          const expActual = (await get(userXPRef)).val() || 0;
          const nuevaExp = expActual + delta;
          await set(userXPRef, nuevaExp);

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

            const nivelActualSnap = await get(userNivelRef);
            const nivelActual = nivelActualSnap.exists() ? nivelActualSnap.val() : 1;
            if (nuevoNivel !== nivelActual) {
              await set(userNivelRef, nuevoNivel);
            }
          }
        };

        for (const [uid, delta] of Object.entries(xpTotal)) {
          await actualizarExperiencia(uid, delta);
        }

        await set(estadoTurnoRef, "finalizado");
        await limpiarFinalPartida();
        await set(cierreRef, null); // ✅ Fin del cierre
        navigate("/UserPage");
        return;
      }

      await set(estadoTurnoRef, `${proximoTurno}-1`);

      if (partidaId.startsWith("bot-vs-") && proximoTurno % 2 === 0) {
        await new Promise((r) => setTimeout(r, 5000));
        const cartasRef = ref(db, `emparejamientos/partidas/${partidaId}/cartas/ficticio`);
        const snap = await get(cartasRef);
        const cartas = snap.val();
        if (cartas) {
          const primeraClave = Object.keys(cartas)[0];
          const idCarta = cartas[primeraClave];
          if (idCarta) {
            await set(ref(db, `emparejamientos/partidas/${partidaId}/cartaekklesiavisible`), {
              id: idCarta,
              lanzadaPor: "ficticio",
              tiempoRestante: 30,
            });
            await remove(ref(db, `emparejamientos/partidas/${partidaId}/cartas/ficticio/${primeraClave}`));
          }
        }
      }

      await set(cierreRef, null); // ✅ Fin del cierre
    };

    const lanzarCartaAutomatica = async (uid) => {
      const cartasRef = ref(db, `emparejamientos/partidas/${partidaId}/cartas/${uid}`);
      const snap = await get(cartasRef);
      const cartas = snap.val();
      if (!cartas) return;
      const clave = Object.keys(cartas)[0];
      const idCarta = cartas[clave];
      if (!idCarta) return;

      await set(cartaRef, {
        id: idCarta,
        lanzadaPor: uid,
        tiempoRestante: 30,
      });

      await remove(ref(db, `emparejamientos/partidas/${partidaId}/cartas/${uid}/${clave}`));
    };

    const iniciarTimeout = (uid, segundos) => {
      if (timeoutAutoCarta) clearTimeout(timeoutAutoCarta);
      timeoutAutoCarta = setTimeout(() => lanzarCartaAutomatica(uid), segundos * 1000);
      setTiempoLanzamiento(segundos);
    };

    onValue(respuestaRef, async (snap) => {
      const cierreSnap = await get(cierreRef);
      if (cierreSnap.exists() && cierreSnap.val() !== null) return;

      const respuestas = snap.val() || {};
      const partidaSnap = await get(partidaPath);
      const partida = partidaSnap.val();

      const { jugador1, jugador2 } = partida;
      const { turno, ronda } = determinarEstadoTurno(respuestas);
      const estadoTurno = `${turno}-${ronda}`;
      await set(estadoTurnoRef, estadoTurno);

      if (turno === 11) {
        await set(estadoTurnoRef, "finalizado");
        await limpiarFinalPartida();
        navigate("/UserPage");
        return;
      }

      const turnoRolesRef = ref(db, `emparejamientos/partidas/${partidaId}/roles/turno${turno}`);
      let uidDesafiante, uidDesafiado;

      if (turno === 1) {
        uidDesafiante = jugador1;
        uidDesafiado = jugador2;
      } else {
        const rolAnteriorSnap = await get(ref(db, `emparejamientos/partidas/${partidaId}/roles/turno${turno - 1}`));
        const rolAnterior = rolAnteriorSnap.val();
        uidDesafiante = rolAnterior?.desafiado;
        uidDesafiado = rolAnterior?.desafiante;
      }

      if (!uidDesafiante || !uidDesafiado) return;

      await set(ref(db, `emparejamientos/partidas/${partidaId}/rol/${uidDesafiante}`), "desafiante");
      await set(ref(db, `emparejamientos/partidas/${partidaId}/rol/${uidDesafiado}`), "desafiado");

      await set(turnoRolesRef, {
        desafiante: uidDesafiante,
        desafiado: uidDesafiado,
      });

      const jugadaPath = ref(db, `emparejamientos/partidas/${partidaId}/respuesta/cartajugada${turno}`);
      const jugadaSnap = await get(jugadaPath);
      const jugadaActual = jugadaSnap.val() || {};

      if (!jugadaActual.uidDesafiante || !jugadaActual.uidDesafiado) {
        await set(jugadaPath, {
          ...jugadaActual,
          uidDesafiante,
          uidDesafiado,
        });
      }

      const cartaSnap = await get(cartaRef);
      const carta = cartaSnap.exists() ? cartaSnap.val() : null;

      const preguntaXP = await (async () => {
        if (!carta?.id) return 0;
        const nivel = carta.id.match(/_n(\d+)p/)?.[1];
        if (!nivel) return 0;
        const preguntasSnap = await get(ref(db, `niveles/${nivel}/preguntas`));
        const preguntas = preguntasSnap.val() || {};
        const pregunta = Object.values(preguntas).find((p) => p.id === carta.id);
        return pregunta?.experiencia || 0;
      })();

      if (estadoTurno.endsWith("-1") && jugadaActual.desafiado === "acierto") {
        await entregarPuntosYFinalizar(turno, preguntaXP);
        return;
      }

      if (estadoTurno === `${turno}-2`) {
        await set(cartaRef, {
          id: carta?.id,
          lanzadaPor: uidDesafiado,
          tiempoRestante: 30,
        });
        setTiempoLanzamiento(30);
        return;
      }

      if (estadoTurno.endsWith("-2") && jugadaActual.desafiado && jugadaActual.desafiante) {
        await entregarPuntosYFinalizar(turno, preguntaXP);
        return;
      }

      if (!carta?.id) {
        iniciarTimeout(uidDesafiante, uidDesafiante === "ficticio" ? 5 : 30);
        setEstadoTurnoTexto(
          jugador.uid === uidDesafiante
            ? "Eres el desafiante. Arrastra una carta al centro para desafiar a tu oponente."
            : "Eres el desafiado. Debes esperar a que lancen la carta de desafío."
        );
      } else {
        setEstadoTurnoTexto(null);
        setTiempoLanzamiento(null);
      }
    });

    get(estadoTurnoRef).then((snap) => {
      if (!snap.exists()) {
        get(respuestaRef).then((respuestaSnap) => {
          const respuestas = respuestaSnap.val() || {};
          const { turno, ronda } = determinarEstadoTurno(respuestas);
          const estadoTurno = `${turno}-${ronda}`;
          set(estadoTurnoRef, estadoTurno);
          // ✅ Aquí se crea correctamente el campo cierredeturno
          set(ref(db, `emparejamientos/partidas/${partidaId}/cierredeturno`), null);
        });
      }
    });

    return () => {
      if (timeoutAutoCarta) clearTimeout(timeoutAutoCarta);
    };
  }, [partidaId, jugador, navigate]);

  useEffect(() => {
    if (tiempoLanzamiento === null || tiempoLanzamiento <= 0) return;
    const intervalo = setInterval(() => {
      setTiempoLanzamiento((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(intervalo);
  }, [tiempoLanzamiento]);

  return (
    <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-50">
      {estadoTurnoTexto && (
        <div className="bg-white px-4 py-2 rounded shadow text-lg text-black font-bold text-center">
          {estadoTurnoTexto}
        </div>
      )}
      {tiempoLanzamiento !== null && (
        <div className="bg-yellow-300 px-4 py-2 rounded shadow text-base text-black font-semibold text-center">
          Tiempo para lanzar carta: {tiempoLanzamiento} segundos
        </div>
      )}
    </div>
  );
};

export default JuezEkklesia;

















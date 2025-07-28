import { useEffect, useRef } from "react";
import { getDatabase, ref, onValue, set, get, update } from "firebase/database";

const BotEkklesia = ({ partidaId }) => {
  const resultadoBotRef = useRef(null);

  useEffect(() => {
    if (!partidaId.startsWith("bot-vs-")) return;

    const db = getDatabase();
    const partidaRef = ref(db, `emparejamientos/partidas/${partidaId}`);

    const unsubscribe = onValue(partidaRef, async (snapshot) => {
      const partida = snapshot.val();
      const carta = partida?.cartaekklesiavisible;
      const estadoTurno = partida?.estadoTurno;
      const respuestas = partida?.respuesta || {};
      const rolesTurno = partida?.roles || {};
      const cierre = partida?.cierredeturno;

      // 🛑 Si se está cerrando el turno, el bot no hace nada
      if (cierre !== null) return;

      if (!estadoTurno || !carta?.id || !carta?.lanzadaPor) return;

      const [turnoStr, rondaStr] = estadoTurno.split("-");
      const turno = parseInt(turnoStr);
      const ronda = parseInt(rondaStr);
      const jugadaActual = respuestas[`cartajugada${turno}`] || {};

      const basePath = `emparejamientos/partidas/${partidaId}/respuesta/cartajugada${turno}`;
      const refDesafiado = ref(db, `${basePath}/desafiado`);
      const refDesafiante = ref(db, `${basePath}/desafiante`);
      const refUidDesafiado = ref(db, `${basePath}/uidDesafiado`);
      const refUidDesafiante = ref(db, `${basePath}/uidDesafiante`);

      const rolTurno = rolesTurno?.[`turno${turno}`];
      if (!rolTurno || !rolTurno.desafiado || !rolTurno.desafiante) return;
      if (rolTurno.desafiado === rolTurno.desafiante) return;

      const estadoRondaActual = `${turno}-${ronda}`;

      // 🔄 Si cambia de ronda, limpiamos lógica previa del bot
      if (resultadoBotRef.current?.estado !== estadoRondaActual) {
        resultadoBotRef.current = null;
      }

      // ❌ Ya actuó esta ronda
      if (resultadoBotRef.current?.estado === estadoRondaActual) return;

      // 🤖 BOT COMO DESAFIADO
      if (
        carta.lanzadaPor !== "ficticio" &&
        ronda === 1 &&
        !jugadaActual.desafiado
      ) {
        resultadoBotRef.current = { estado: estadoRondaActual };

        setTimeout(async () => {
          try {
            const match = carta.id.match(/_n(\d+)p/);
            if (!match) return;
            const nivel = parseInt(match[1]);
            const preguntasRef = ref(db, `niveles/${nivel}/preguntas`);
            const preguntasSnap = await get(preguntasRef);
            if (!preguntasSnap.exists()) return;

            let correcta = null;
            preguntasSnap.forEach((snap) => {
              const p = snap.val();
              if (p.id === carta.id) correcta = p.correcta;
            });

            if (!correcta) return;

            const probabilidad = nivel * 10;
            const random = Math.floor(Math.random() * 100);
            const resultado = random < probabilidad ? "acierto" : "fallo";

            await set(refDesafiado, resultado);
            await update(ref(db, basePath), {
              uidDesafiado: "ficticio",
              uidDesafiante: carta.lanzadaPor,
            });

            resultadoBotRef.current = null;
          } catch (error) {
            console.error("❌ Error en lógica del bot (desafiado):", error);
            resultadoBotRef.current = null;
          }
        }, 2000);
      }

      // 🤖 BOT COMO DESAFIANTE
      if (
        carta.lanzadaPor === "ficticio" &&
        ronda === 2 &&
        jugadaActual.desafiado === "fallo" &&
        !jugadaActual.desafiante
      ) {
        resultadoBotRef.current = { estado: estadoRondaActual };

        setTimeout(async () => {
          try {
            const resultado = Math.random() < 0.3 ? "acierto" : "fallo";
            await set(refDesafiante, resultado);
            await update(ref(db, basePath), {
              uidDesafiado: carta.lanzadaPor,
              uidDesafiante: "ficticio",
            });

            resultadoBotRef.current = null;
          } catch (error) {
            console.error("❌ Error en lógica del bot (desafiante):", error);
            resultadoBotRef.current = null;
          }
        }, 2000);
      }
    });

    return () => unsubscribe();
  }, [partidaId]);

  return null;
};

export default BotEkklesia;

















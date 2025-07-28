import { useEffect, useRef } from "react";
import { getDatabase, ref, get, set, update } from "firebase/database";
import { useAuth } from "../AuthContext";

const useNivelListener = (setMostrarCarta, setBotonesActivos) => {
  const { currentUser } = useAuth();
  const nivelAnteriorRef = useRef(null); // 💾 Guarda el nivel anterior

  useEffect(() => {
    const db = getDatabase();
    const uid = currentUser?.uid;
    if (!uid) return;

    // 🔁 FUNCIÓN 1: Verifica si existe Agora_Pdisponible; si no, la crea
    const verificarOCrearPreguntasDisponibles = async () => {
      const userRef = ref(db, `usuarios/${uid}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) return;

      const userData = snapshot.val();
      const nivel = userData.nivel || 1;
      const agoraDisponibleRef = ref(db, `usuarios/${uid}/Agora_Pdisponible`);

      const disponibleSnapshot = await get(agoraDisponibleRef);
      if (!disponibleSnapshot.exists()) {
        const nivelDificultad = Math.max(0, nivel - 1);
        const preguntasRef = ref(db, `niveles/${nivelDificultad}/preguntas`);
        const preguntasSnap = await get(preguntasRef);
        if (preguntasSnap.exists()) {
          const preguntas = preguntasSnap.val();
          const nuevasPreguntas = {};
          for (const key in preguntas) {
            const pregunta = preguntas[key];
            nuevasPreguntas[pregunta.id] = true;
          }
          await set(agoraDisponibleRef, nuevasPreguntas);
        }
      }
    };

    // 🔁 FUNCIÓN 2: Verifica si la experiencia corresponde a un nuevo nivel
    const verificarEscaladoYActualizarNivel = async () => {
      const userRef = ref(db, `usuarios/${uid}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) return;

      const userData = snapshot.val();
      const experiencia = userData.experiencia || 0;
      const nivelActual = userData.nivel || 1;

      // Guarda el nivel previo en memoria (solo una vez)
      if (nivelAnteriorRef.current === null) {
        nivelAnteriorRef.current = nivelActual;
      }

      const escaladoRef = ref(db, "escalado/niveles");
      const escaladoSnap = await get(escaladoRef);
      const escalado = escaladoSnap.val();

      let nuevoNivel = nivelActual;
      for (const [nivelStr, rango] of Object.entries(escalado)) {
        const nivel = parseInt(nivelStr);
        if (experiencia >= rango.min && experiencia <= rango.max) {
          nuevoNivel = nivel;
          break;
        }
      }

      if (nuevoNivel !== nivelActual) {
        const nuevoTituloRef = ref(db, `titulos/${nuevoNivel}`);
        const nuevoTituloSnap = await get(nuevoTituloRef);
        const nuevoTitulo = nuevoTituloSnap.exists() ? nuevoTituloSnap.val() : "sin título";

        await update(userRef, {
          nivel: nuevoNivel,
          titulo: nuevoTitulo
        });

        await set(ref(db, `usuarios/${uid}/Agora_Pdisponible`), null);
        await set(ref(db, `usuarios/${uid}/Agora_Paciertos`), null);
        await set(ref(db, `usuarios/${uid}/Agora_Pfallo`), null);

        const nivelDificultad = Math.max(0, nuevoNivel - 1);
        const preguntasRef = ref(db, `niveles/${nivelDificultad}/preguntas`);
        const preguntasSnap = await get(preguntasRef);
        if (preguntasSnap.exists()) {
          const preguntas = preguntasSnap.val();
          const nuevasPreguntas = {};
          for (const key in preguntas) {
            const pregunta = preguntas[key];
            nuevasPreguntas[pregunta.id] = true;
          }
          await set(ref(db, `usuarios/${uid}/Agora_Pdisponible`), nuevasPreguntas);
        }

        // 🎉 MOSTRAR MENSAJE Y CERRAR CARTA
        alert(`🎉 ¡Felicitaciones! Tu nuevo nivel es: ${nuevoNivel} y tu título es: ${nuevoTitulo}`);
        if (setMostrarCarta) setMostrarCarta(false);
        if (setBotonesActivos) setBotonesActivos(true);
      }

      // Actualiza el nivel anterior para detectar futuros cambios
      nivelAnteriorRef.current = nuevoNivel;
    };

    verificarEscaladoYActualizarNivel();
    verificarOCrearPreguntasDisponibles();
  }, [currentUser, setMostrarCarta, setBotonesActivos]);
};

export default useNivelListener;

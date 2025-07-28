
import { useEffect } from "react";
import { getDatabase, ref, get, set } from "firebase/database";
import { useAuth } from "../../AuthContext";

const useNivelListener = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    const db = getDatabase();
    const uid = currentUser?.uid;
    if (!uid) return;

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

    verificarOCrearPreguntasDisponibles();
  }, [currentUser]);
};

export default useNivelListener;

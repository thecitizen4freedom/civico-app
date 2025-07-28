import React, { useEffect, useState } from "react";
import { getDatabase, ref, get, set, onValue, off } from "firebase/database";
import { useAuth } from "@/AuthContext";

const CartaMazoEkklesia = ({
  id,
  onSeleccionar,
  onDescartar,
  puedeDescartar = false,
  partidaId,
}) => {
  const { currentUser } = useAuth();
  const [pregunta, setPregunta] = useState(null);
  const [xp, setXp] = useState(null);
  const [puedeArrastrar, setPuedeArrastrar] = useState(false);
  const [existeEnMazo, setExisteEnMazo] = useState(true);
  const [rolJugador, setRolJugador] = useState(null);
  const [estadoTurno, setEstadoTurno] = useState("");
  const [hayCartaActiva, setHayCartaActiva] = useState(false);

  useEffect(() => {
    const cargarDatosCarta = async () => {
      if (!id) return;
      const db = getDatabase();
      const nivelMatch = id.match(/_n(\d+)p/);
      if (!nivelMatch) return;
      const nivel = nivelMatch[1];
      const path = `niveles/${nivel}/preguntas`;
      const snapshot = await get(ref(db, path));
      if (snapshot.exists()) {
        const preguntas = snapshot.val();
        const clave = Object.keys(preguntas).find((k) => preguntas[k].id === id);
        if (clave) {
          setPregunta(preguntas[clave].pregunta || "");
          setXp(preguntas[clave].experiencia || 0);
        }
      }
    };
    cargarDatosCarta();
  }, [id]);

  useEffect(() => {
    const db = getDatabase();
    const rolRef = ref(db, `emparejamientos/partidas/${partidaId}/rol/${currentUser.uid}`);
    const cartaRef = ref(db, `emparejamientos/partidas/${partidaId}/cartaekklesiavisible`);
    const estadoRef = ref(db, `emparejamientos/partidas/${partidaId}/estadoTurno`);
    const mazoRef = ref(db, `emparejamientos/partidas/${partidaId}/cartas/${currentUser.uid}`);

    const unsub1 = onValue(rolRef, (snap) => {
      const rol = snap.val();
      setRolJugador(rol);
    });

    const unsub2 = onValue(cartaRef, (snap) => {
      setHayCartaActiva(snap.exists());
    });

    const unsub3 = onValue(estadoRef, (snap) => {
      const est = snap.val() || "";
      setEstadoTurno(est);
    });

    const unsub4 = onValue(mazoRef, (snap) => {
      const lista = snap.val();
      if (!lista) return setExisteEnMazo(false);
      const esta = Array.isArray(lista)
        ? lista.includes(id)
        : Object.values(lista).includes(id);
      setExisteEnMazo(esta);
    });

    return () => {
      off(rolRef, "value", unsub1);
      off(cartaRef, "value", unsub2);
      off(estadoRef, "value", unsub3);
      off(mazoRef, "value", unsub4);
    };
  }, [partidaId, currentUser, id]);

  const reemplazarPorNuevaCarta = async () => {
    const db = getDatabase();

    // Validar descartes < 5
    const descRef = ref(db, `emparejamientos/partidas/${partidaId}/descartes/${currentUser.uid}`);
    const descSnap = await get(descRef);
    const cantidad = descSnap.exists() ? descSnap.val() : 0;
    if (cantidad >= 5) {
      console.warn("❌ Ya se usaron los 5 descartes.");
      return;
    }

    const mazoRef = ref(db, `emparejamientos/partidas/${partidaId}/cartas/${currentUser.uid}`);
    const mazoSnap = await get(mazoRef);
    const mazo = mazoSnap.val();
    if (!mazo || typeof mazo !== "object") return;

    const clave = Object.keys(mazo).find((k) => mazo[k] === id);
    if (!clave) return;

    const dispoRef = ref(db, `emparejamientos/partidas/${partidaId}/ekklesia_pdisponible`);
    const dispoSnap = await get(dispoRef);
    const lista = dispoSnap.exists() ? Object.values(dispoSnap.val()) : [];
    if (lista.length === 0) return;

    const nuevoId = lista[0];
    const nuevaLista = lista.slice(1);

    await set(ref(db, `emparejamientos/partidas/${partidaId}/cartas/${currentUser.uid}/${clave}`), nuevoId);
    await set(dispoRef, nuevaLista);
    await set(descRef, cantidad + 1);

    console.log("🟢 Carta descartada y reemplazada:", id, "→", nuevoId);
    if (onDescartar) onDescartar();
  };

  const puedeLanzarCarta =
    rolJugador === "desafiante" &&
    estadoTurno.endsWith("-1") &&
    !hayCartaActiva;

  if (!existeEnMazo || pregunta === null || xp === null) return null;

  return (
    <div
      className="relative w-[200px] h-[320px] m-2 cursor-pointer rounded-2xl bg-gradient-to-b from-yellow-100 to-yellow-200 border-2 border-yellow-700 shadow-xl p-2"
      onClick={onSeleccionar}
      draggable={puedeLanzarCarta}
      onDragStart={(e) => {
        if (puedeLanzarCarta) {
          e.dataTransfer.setData("text/plain", id);
          console.log("🟢 Arrastrando carta:", id);
        } else {
          e.preventDefault();
          console.warn("❌ No se puede arrastrar esta carta:", id);
        }
      }}
    >
      <div className="absolute top-1 left-2 text-[10px] font-bold text-yellow-900 bg-yellow-300 px-1 rounded">
        {id}
      </div>
      <div className="absolute top-1 right-2 text-[12px] font-bold text-yellow-900 bg-yellow-300 px-1 rounded">
        XP: {xp}
      </div>
      <div className="text-[18px] text-yellow-900 font-semibold text-center px-2 pt-10 leading-tight">
        {pregunta}
      </div>
      {puedeDescartar && (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            console.log("🟡 Botón cerrar presionado para:", id);
            await reemplazarPorNuevaCarta();
          }}
          className="absolute bottom-3 right-3 text-[12px] bg-red-600 text-white px-3 py-1 rounded hover:bg-red-800"
        >
          Cerrar
        </button>
      )}
    </div>
  );
};

export default CartaMazoEkklesia;








import React, { useEffect, useState, useRef } from "react";
import { getDatabase, ref, get, set, onValue, off } from "firebase/database";
import CartaEkklesia from "./CartaEkklesia";
import CartaMazoEkklesia from "./CartaMazoEkklesia";
import BotEkklesia from "./BotEkklesia";

const EkklesiaModule = ({ partidaId, jugador }) => {
  const [cartas, setCartas] = useState([]);
  const [datosCartas, setDatosCartas] = useState({});
  const [cartaActiva, setCartaActiva] = useState(null);
  const [cartaLanzadaPor, setCartaLanzadaPor] = useState(null);
  const [descartes, setDescartes] = useState(0);
  const [mensajeDescartes, setMensajeDescartes] = useState(false);
  const [mazoCargado, setMazoCargado] = useState(false);
  const [puedeLanzar, setPuedeLanzar] = useState(false);
  const [claveTurno, setClaveTurno] = useState(Date.now());

  const zonaCentroRef = useRef(null);
  const db = getDatabase();

  useEffect(() => {
    const rutaCartas = `emparejamientos/partidas/${partidaId}/cartas/${jugador.uid}`;
    const refCartas = ref(db, rutaCartas);
    const unsub = onValue(refCartas, (snap) => {
      if (snap.exists()) {
        const ids = snap.val();
        setCartas(ids);
        cargarDatosCartas(ids).then(() => setMazoCargado(true));
      }
    });
    return () => off(refCartas, "value", unsub);
  }, [partidaId, jugador.uid]);

  useEffect(() => {
    const rutaDescartes = `emparejamientos/partidas/${partidaId}/descartes/${jugador.uid}`;
    get(ref(db, rutaDescartes)).then((snap) => {
      if (snap.exists()) setDescartes(snap.val());
    });

    const cartaVisibleRef = ref(db, `emparejamientos/partidas/${partidaId}/cartaekklesiavisible`);
    const unsubCarta = onValue(cartaVisibleRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setCartaActiva(data.id);
        setCartaLanzadaPor(data.lanzadaPor);
      } else {
        setCartaActiva(null);
        setCartaLanzadaPor(null);
      }
    });

    return () => off(cartaVisibleRef, "value", unsubCarta);
  }, [partidaId, jugador.uid]);

  // ✅ CORREGIDO: escucha en estadoTurno (no turno)
  useEffect(() => {
    const rolRef = ref(db, `emparejamientos/partidas/${partidaId}/rol/${jugador.uid}`);
    const estadoTurnoRef = ref(db, `emparejamientos/partidas/${partidaId}/estadoTurno`);
    const cartaRef = ref(db, `emparejamientos/partidas/${partidaId}/cartaekklesiavisible`);

    let esDesafiante = false;
    let rondaUno = false;
    let hayCartaActiva = false;

    const actualizarPermiso = () => {
      const permitido = esDesafiante && rondaUno && !hayCartaActiva;
      setPuedeLanzar(permitido);
    };

    const unsubRol = onValue(rolRef, (snap) => {
      esDesafiante = snap.exists() && snap.val() === "desafiante";
      actualizarPermiso();
    });

    const unsubEstado = onValue(estadoTurnoRef, (snap) => {
      const turnoStr = snap.val();
      rondaUno = typeof turnoStr === "string" && turnoStr.endsWith("-1");
      actualizarPermiso();
    });

    const unsubCarta = onValue(cartaRef, (snap) => {
      hayCartaActiva = snap.exists();
      actualizarPermiso();
    });

    return () => {
      off(rolRef, "value", unsubRol);
      off(estadoTurnoRef, "value", unsubEstado);
      off(cartaRef, "value", unsubCarta);
    };
  }, [partidaId, jugador.uid]);

  useEffect(() => {
    const estadoTurnoRef = ref(db, `emparejamientos/partidas/${partidaId}/estadoTurno`);
    const unsub = onValue(estadoTurnoRef, (snap) => {
      if (snap.exists()) {
        setClaveTurno(Date.now());
      }
    });
    return () => off(estadoTurnoRef, "value", unsub);
  }, [partidaId]);

  const cargarDatosCartas = async (ids) => {
    const nuevas = {};
    const agrupadasPorNivel = {};

    ids.forEach((id) => {
      const match = id.match(/_n(\d+)p/);
      if (!match) return;
      const nivel = match[1];
      if (!agrupadasPorNivel[nivel]) agrupadasPorNivel[nivel] = [];
      agrupadasPorNivel[nivel].push(id);
    });

    for (const nivel in agrupadasPorNivel) {
      const snap = await get(ref(db, `niveles/${nivel}/preguntas`));
      if (!snap.exists()) continue;

      const preguntas = snap.val();
      for (const clave in preguntas) {
        const pregunta = preguntas[clave];
        if (agrupadasPorNivel[nivel].includes(pregunta.id)) {
          nuevas[pregunta.id] = pregunta;
        }
      }
    }

    setDatosCartas(nuevas);
  };

  const onDrop = async (e) => {
    e.preventDefault();
    if (!puedeLanzar) return;

    const cartaId = e.dataTransfer.getData("text/plain");
    if (!cartas.includes(cartaId)) return;

    const snap = await get(ref(db, `emparejamientos/partidas/${partidaId}/cartaekklesiavisible`));
    if (snap.exists()) return;

    await set(ref(db, `emparejamientos/partidas/${partidaId}/cartaekklesiavisible`), {
      id: cartaId,
      lanzadaPor: jugador.uid,
      tiempoRestante: 30,
    });

    const nuevasCartas = cartas.filter((c) => c !== cartaId);
    setCartas(nuevasCartas);
    await set(ref(db, `emparejamientos/partidas/${partidaId}/cartas/${jugador.uid}`), nuevasCartas);
  };

  const allowDrop = (e) => e.preventDefault();

  const onDescartar = async (id) => {
    if (descartes >= 5) {
      setMensajeDescartes(true);
      setTimeout(() => setMensajeDescartes(false), 3000);
      return;
    }

    const disponiblesRef = ref(db, `emparejamientos/partidas/${partidaId}/ekklesia_pdisponible`);
    const snap = await get(disponiblesRef);
    if (!snap.exists()) return;
    const disponibles = snap.val();
    if (!disponibles.length) return;

    const nuevaCarta = disponibles[0];
    const nuevasCartas = cartas.filter((c) => c !== id).concat(nuevaCarta);
    await set(ref(db, `emparejamientos/partidas/${partidaId}/cartas/${jugador.uid}`), nuevasCartas);
    await set(disponiblesRef, disponibles.slice(1));
    await set(ref(db, `emparejamientos/partidas/${partidaId}/descartes/${jugador.uid}`), descartes + 1);

    setCartas(nuevasCartas);
    setDescartes((prev) => prev + 1);
  };

  const renderCartaMazo = (id) => {
    if (!datosCartas[id]) return null;
    return (
      <CartaMazoEkklesia
        key={id}
        id={id}
        bocaArriba={true}
        onSeleccionar={() => {}}
        onDescartar={() => onDescartar(id)}
        puedeDescartar={true}
        partidaId={partidaId}
      />
    );
  };

  // ✅ Fallback si no hay datos aún
  if (!partidaId || !jugador || !mazoCargado) return null;

  return (
    <div className="relative w-full h-full">
      {mensajeDescartes && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-center text-sm bg-yellow-600 text-white px-3 py-1 rounded shadow-md z-50">
          Ya ha descartado todas las opciones disponibles.
        </div>
      )}

      <div
        ref={zonaCentroRef}
        className="absolute top-[17%] left-[20%] w-[60%] h-[35%] border-dashed border-4 border-yellow-400 rounded-xl z-10"
        onDrop={onDrop}
        onDragOver={allowDrop}
      />

      <div className="absolute bottom-0 w-full px-5 py-5 flex flex-col items-center">
        <div className="flex items-center mb-2 self-start">
          <img src={jugador.foto} alt="avatar" className="w-12 h-12 rounded-full mr-2" />
          <div className="text-white text-sm">
            <div className="font-bold">{jugador.nombre}</div>
            <div>Nivel: {jugador.nivel}</div>
            <div>XP: {jugador.experiencia}</div>
          </div>
        </div>

        <div className="flex flex-col gap+12">
          <div className="flex justify-center gap-36">
            {cartas.slice(0, 3).map(renderCartaMazo)}
          </div>
          <div className="flex justify-center gap-36 mt-6">
            {cartas.slice(3).map(renderCartaMazo)}
          </div>
        </div>
      </div>

      {cartaActiva && (
        <div className="absolute inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <CartaEkklesia
            key={claveTurno}
            idCarta={cartaActiva}
            jugadorQueLanza={cartaLanzadaPor}
            partidaId={partidaId}
            jugador={jugador}
          />
        </div>
      )}

      <BotEkklesia partidaId={partidaId} />
    </div>
  );
};

export default EkklesiaModule;


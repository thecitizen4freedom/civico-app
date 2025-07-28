import React from "react";
import agoraIcon from "../../../assets/agora-icon.png";

const AgoraModule = ({ userData, setPreguntaActual, setMostrarCarta }) => {
  const iniciarAgora = async () => {
    if (!userData) return;

    // Aquí iría la lógica de cargar pregunta desde Firebase según nivel
    const preguntaEjemplo = {
      pregunta: "¿Qué debe preceder al derecho constitucional según el PCL?",
      opciones: ["El respaldo militar", "Conciencia soberana", "ONU", "Referendo internacional"],
      correcta: "Conciencia soberana",
      experiencia: 40,
    };

    setPreguntaActual(preguntaEjemplo);
    setMostrarCarta(true);
  };

  return (
    <button onClick={iniciarAgora} className="focus:outline-none">
      <img src={agoraIcon} alt="Ágora" className="w-20 hover:scale-110 transition-transform" />
    </button>
  );
};

export default AgoraModule;

// cartaUtils.js
export const mostrarCarta = (setMostrarCarta, setPreguntaActual, pregunta) => {
  setPreguntaActual(pregunta);
  setMostrarCarta(true);
};

export const cerrarCarta = (setMostrarCarta, setPreguntaActual, setRespuestaSeleccionada, setTiempoRestante) => {
  setMostrarCarta(false);
  setPreguntaActual(null);
  setRespuestaSeleccionada(null);
  setTiempoRestante(30);
};

export const finalizarCarta = (cerrarCarta, recargarPregunta) => {
  cerrarCarta();
  recargarPregunta();
};

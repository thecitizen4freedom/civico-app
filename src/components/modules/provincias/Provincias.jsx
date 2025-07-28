import React from "react";
import cubaMap from "../../../assets/mapa-cuba.png";

const Provincias = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-0">
      <img src={cubaMap} alt="Mapa de Cuba" className="w-[90%]" />
    </div>
  );
};

export default Provincias;

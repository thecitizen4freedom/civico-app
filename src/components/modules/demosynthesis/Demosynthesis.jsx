import React from "react";
import demosIcon from "../../../assets/demosynthesis-icon.png";

const Demosynthesis = () => {
  return (
    <button onClick={() => alert("Demosynthesis no implementado aún.")} className="focus:outline-none">
      <img src={demosIcon} alt="Demosynthesis" className="w-20 hover:scale-110 transition-transform" />
    </button>
  );
};

export default Demosynthesis;

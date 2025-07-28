
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { ref, get, set } from "firebase/database";
import { db } from "../firebase";

function AdminPage() {
  const [preguntaManual, setPreguntaManual] = useState({
    numero: "",
    nivel: "",
    experiencia: "",
    pregunta: "",
    a: "",
    b: "",
    c: "",
    d: "",
    correcta: "",
    explicacion: ""
  });

  const [preguntasExcel, setPreguntasExcel] = useState([]);

  // Manejador para preguntas individuales manuales
  const handleManualChange = (e) => {
    setPreguntaManual({ ...preguntaManual, [e.target.name]: e.target.value });
  };

  const guardarPreguntaManual = async () => {
    try {
      const nivel = preguntaManual.nivel;
      const nivelRef = ref(db, `niveles/${nivel}/preguntas`);
      const snapshot = await get(nivelRef);
      const preguntasExistentes = snapshot.exists() ? Object.keys(snapshot.val()) : [];
      const nuevoIndice = preguntasExistentes.length + 1;
      const nuevaClave = `p${nuevoIndice}`;

      await set(ref(db, `niveles/${nivel}/preguntas/${nuevaClave}`), {
        pregunta: preguntaManual.pregunta,
        a: preguntaManual.a,
        b: preguntaManual.b,
        c: preguntaManual.c,
        d: preguntaManual.d,
        correcta: preguntaManual.correcta,
        explicacion: preguntaManual.explicacion,
        experiencia: parseInt(preguntaManual.experiencia)
      });

      alert("Pregunta guardada con éxito.");
    } catch (error) {
      alert("Error al guardar la pregunta: " + error.message);
    }
  };

  // Procesamiento del Excel subido
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const preguntas = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row.length >= 9) {
          preguntas.push({
            numero: row[0],
            nivel: row[1],
            experiencia: row[2],
            pregunta: row[3],
            a: row[4],
            b: row[5],
            c: row[6],
            d: row[7],
            correcta: row[8],
            explicacion: row[9] || ""
          });
        }
      }

      setPreguntasExcel(preguntas);
    };

    reader.readAsBinaryString(file);
  };

  // Guardar todas las preguntas del Excel en Firebase bajo la rama niveles
  const guardarPreguntasExcelEnFirebase = async () => {
    try {
      const nivelesAgrupados = {};

      for (const p of preguntasExcel) {
        if (!nivelesAgrupados[p.nivel]) {
          nivelesAgrupados[p.nivel] = [];
        }
        nivelesAgrupados[p.nivel].push(p);
      }

      for (const nivel in nivelesAgrupados) {
        const nivelRef = ref(db, `niveles/${nivel}/preguntas`);
        const snapshot = await get(nivelRef);
        const preguntasExistentes = snapshot.exists() ? Object.keys(snapshot.val()) : [];
        let contador = preguntasExistentes.length;

        for (const pregunta of nivelesAgrupados[nivel]) {
          contador++;
          const nuevaClave = `p${contador}`;

          await set(ref(db, `niveles/${nivel}/preguntas/${nuevaClave}`), {
            pregunta: pregunta.pregunta,
            a: pregunta.a,
            b: pregunta.b,
            c: pregunta.c,
            d: pregunta.d,
            correcta: pregunta.correcta,
            explicacion: pregunta.explicacion,
            experiencia: parseInt(pregunta.experiencia)
          });
        }
      }

      alert("Preguntas del Excel guardadas exitosamente.");
    } catch (error) {
      alert("Error al guardar preguntas del Excel: " + error.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Panel de Administración</h2>

      <h3>Crear Pregunta Manual</h3>
      <input name="nivel" placeholder="Nivel" onChange={handleManualChange} />
      <input name="experiencia" placeholder="Experiencia" onChange={handleManualChange} />
      <input name="pregunta" placeholder="Pregunta" onChange={handleManualChange} />
      <input name="a" placeholder="Respuesta A" onChange={handleManualChange} />
      <input name="b" placeholder="Respuesta B" onChange={handleManualChange} />
      <input name="c" placeholder="Respuesta C" onChange={handleManualChange} />
      <input name="d" placeholder="Respuesta D" onChange={handleManualChange} />
      <input name="correcta" placeholder="Correcta (a,b,c,d)" onChange={handleManualChange} />
      <input name="explicacion" placeholder="Explicación" onChange={handleManualChange} />
      <button onClick={guardarPreguntaManual}>Guardar Pregunta Manual</button>

      <hr />

      <h3>Cargar Preguntas desde Excel</h3>
      <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} />
      <button onClick={guardarPreguntasExcelEnFirebase}>Guardar en Firebase</button>

      {preguntasExcel.length > 0 && (
        <div>
          <h4>Preguntas cargadas:</h4>
          {preguntasExcel.map((p, i) => (
            <div key={i} style={{ borderBottom: "1px solid #ccc", margin: 10, padding: 10 }}>
              <strong>Nivel {p.nivel}:</strong> {p.pregunta}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPage;

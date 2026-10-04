"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import Aviso from "@/components/Aviso";
import { cx } from "@/lib/cx";
import {
  armarPartido,
  CANTIDAD_SUPLENTES,
  crearCadenas,
  ESTADISTICAS_VACIAS,
  totales,
} from "@/lib/cargarPartido";
import { guardarPartidoHacoaj } from "@/lib/data/partidos";
import { FORMACIONES } from "@/lib/formaciones";
import { createClient } from "@/lib/supabase/client";
import { useAviso } from "@/lib/useAviso";
import PasoFormacion from "./PasoFormacion";
import PasoInfo from "./PasoInfo";
import PasoMinutos from "./PasoMinutos";
import styles from "./CargarPartido.module.css";

const FORMACION_INICIAL = "4-4-2";
const NOMBRES_PASOS = ["Info", "Formación", "Minutos"];

const puestosVacios = (formacion) => FORMACIONES[formacion].map((p) => ({ ...p, jugadorId: null }));

function fechaDeHoy() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

// Cargar partido (solo administrador), copiado de la v1 en tres pasos: datos del partido,
// formación (titulares en la cancha y banco) y minutos / goles / cambios. Al final se guarda
// todo junto en la base (función `guardar_partido_hacoaj`).
//
// Props: rivales (lista de nombres) y jugadores ([{ id, nombre, foto }]).
export default function CargarPartido({ rivales, jugadores }) {
  const router = useRouter();
  const aviso = useAviso();

  const [paso, setPaso] = useState(1);
  const [info, setInfo] = useState({
    fecha: fechaDeHoy(),
    condicion: "Local",
    rival: "",
    golesHacoaj: "0",
    golesRival: "0",
    estadisticas: { ...ESTADISTICAS_VACIAS },
  });
  const [formacion, setFormacion] = useState(FORMACION_INICIAL);
  const [puestos, setPuestos] = useState(() => puestosVacios(FORMACION_INICIAL));
  const [banco, setBanco] = useState(() => Array(CANTIDAD_SUPLENTES).fill(null));
  const [capitan, setCapitan] = useState("");
  const [cadenas, setCadenas] = useState([]);
  const [guardando, setGuardando] = useState(false);

  // Si el capitán deja de ser titular (lo sacaron de la cancha), se descarta.
  const capitanId = puestos.some((p) => p.jugadorId === capitan) ? capitan : "";
  const golesHacoaj = parseInt(info.golesHacoaj, 10) || 0;

  function elegirFormacion(nueva) {
    setFormacion(nueva);
    setPuestos(puestosVacios(nueva));
    setBanco(Array(CANTIDAD_SUPLENTES).fill(null));
  }

  // Pone (o saca, con `jugadorId = null`) un jugador de un lugar de la cancha o del banco.
  function ubicar(tipo, indice, jugadorId) {
    if (tipo === "cancha") {
      setPuestos((actuales) => actuales.map((p, i) => (i === indice ? { ...p, jugadorId } : p)));
    } else {
      setBanco((actual) => actual.map((id, i) => (i === indice ? jugadorId : id)));
    }
  }

  function irAlPaso(destino) {
    if (destino === 2) {
      if (!info.fecha) return aviso.mostrar("Elegí la fecha del partido", "error");
      if (!info.rival) return aviso.mostrar("Seleccioná el equipo rival", "error");
    }
    if (destino === 3) {
      if (puestos.filter((p) => p.jugadorId).length < 11) return aviso.mostrar("Completá los 11 titulares", "error");
      if (!capitanId) return aviso.mostrar("Tenés que seleccionar un capitán", "error");
      setCadenas(crearCadenas(puestos));
    }
    setPaso(destino);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardar() {
    const suma = totales(cadenas);
    if (suma.goles > golesHacoaj) {
      return aviso.mostrar(`Los goles individuales (${suma.goles}) superan los de Hacoaj (${golesHacoaj})`, "error");
    }
    if (suma.asistencias > golesHacoaj) {
      return aviso.mostrar(`Las asistencias (${suma.asistencias}) superan los goles de Hacoaj (${golesHacoaj})`, "error");
    }

    setGuardando(true);
    const resultado = await guardarPartidoHacoaj(
      createClient(),
      armarPartido({ info, formacion, capitanId, cadenas, banco }),
    );
    if (!resultado.ok) {
      setGuardando(false);
      return aviso.mostrar(resultado.error, "error");
    }
    aviso.mostrar("Partido guardado correctamente", "exito");
    setTimeout(() => router.push("/panel"), 1500);
  }

  return (
    <>
      <div className={styles.pasos} role="list" aria-label="Pasos">
        {NOMBRES_PASOS.map((nombre, i) => {
          const numero = i + 1;
          return (
            <Fragment key={nombre}>
              <div
                role="listitem"
                aria-current={paso === numero ? "step" : undefined}
                className={cx(styles.paso, paso === numero && styles.pasoActivo, paso > numero && styles.pasoHecho)}
              >
                <span className={styles.numeroPaso}>{numero}</span> {nombre}
              </div>
              {numero < NOMBRES_PASOS.length && (
                <div className={cx(styles.separadorPaso, paso > numero && styles.separadorHecho)} />
              )}
            </Fragment>
          );
        })}
      </div>

      {paso === 1 && <PasoInfo info={info} alCambiar={setInfo} rivales={rivales} alContinuar={() => irAlPaso(2)} />}

      {paso === 2 && (
        <PasoFormacion
          jugadores={jugadores}
          formacion={formacion}
          puestos={puestos}
          banco={banco}
          capitanId={capitanId}
          alElegirFormacion={elegirFormacion}
          alUbicar={ubicar}
          alElegirCapitan={setCapitan}
          alVolver={() => irAlPaso(1)}
          alContinuar={() => irAlPaso(3)}
        />
      )}

      {paso === 3 && (
        <PasoMinutos
          jugadores={jugadores}
          cadenas={cadenas}
          banco={banco}
          capitanId={capitanId}
          golesHacoaj={golesHacoaj}
          alCambiar={setCadenas}
          alAvisar={aviso.mostrar}
          alVolver={() => irAlPaso(2)}
          alGuardar={guardar}
          guardando={guardando}
        />
      )}

      <Aviso mensaje={aviso.mensaje} tipo={aviso.tipo} visible={aviso.visible} />
    </>
  );
}

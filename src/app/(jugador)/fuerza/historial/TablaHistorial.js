import { fechaLegible, formatear } from "@/lib/fuerza";
import styles from "./TablaHistorial.module.css";

// Tabla con todas las mediciones de un ejercicio (copiada de la v1).
//
// Props:
//   registros  lista de mediciones, de la más nueva a la más vieja
//   campos     nombres de columna de ese ejercicio (ver lib/historialFuerza.js)
export default function TablaHistorial({ registros, campos }) {
  return (
    <div className={styles.tarjeta}>
      <table className={styles.tabla}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Peso</th>
            <th>Carga</th>
            <th>VMP</th>
            <th>RM Est.</th>
            <th>F. Rel.</th>
          </tr>
        </thead>
        <tbody>
          {registros.length === 0 ? (
            <tr>
              <td colSpan={6} className={styles.vacio}>
                Sin registros
              </td>
            </tr>
          ) : (
            registros.map((r, indice) => (
              <tr key={`${r[campos.fecha]}-${indice}`}>
                <td>{fechaLegible(r[campos.fecha]) || "—"}</td>
                <td>{formatear(r.Peso, 1, "—")} kg</td>
                <td>{formatear(r[campos.carga], 1, "—")} kg</td>
                <td>{formatear(r[campos.vmp], 2, "—")}</td>
                <td>{formatear(r[campos.rm], 1, "—")} kg</td>
                <td className={styles.destacado}>
                  {formatear(r[campos.relativa], 2, "—")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

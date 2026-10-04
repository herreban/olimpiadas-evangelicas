import { useState } from 'react';
import { categoriaDe, edadEnAnio, fechaValida } from '../lib/categoria';

/**
 * Comprobación de que las islas de React funcionan y de que comparten la misma lógica que
 * usará la aplicación: se escribe un año de nacimiento y se ve la categoría.
 */
export default function CalculadoraCategoria({ anioEdicion = 2026 }: { anioEdicion?: number }) {
  const [fecha, setFecha] = useState('2018-04-12');

  const correcta = fechaValida(fecha);
  const edad = correcta ? edadEnAnio(fecha, anioEdicion) : null;
  const categoria = edad === null ? null : categoriaDe(edad);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold">Categoría de un participante</h2>
      <p className="mt-1 text-sm text-slate-600">
        Edición de {anioEdicion}. Escribe una fecha de nacimiento y mira en qué par de edades cae.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium" htmlFor="fecha-nacimiento">
          Nacido el
        </label>
        <input
          id="fecha-nacimiento"
          type="date"
          value={fecha}
          onChange={(evento) => setFecha(evento.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-base"
        />
      </div>

      <p className="mt-3 text-2xl font-bold">
        {!correcta && <span className="text-red-700">Escribe una fecha válida</span>}
        {correcta && categoria && (
          <span className="text-emerald-800">
            {categoria[0]}–{categoria[1]} años
          </span>
        )}
        {correcta && !categoria && (
          <span className="text-amber-700">Fuera de categoría ({edad} años)</span>
        )}
      </p>
    </section>
  );
}

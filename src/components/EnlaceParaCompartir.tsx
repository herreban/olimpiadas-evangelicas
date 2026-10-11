import { useState } from 'react';

/**
 * Un enlace recién creado, listo para pasarlo a mano: copiarlo o mandarlo por WhatsApp.
 * Solo se ve una vez; si se pierde, se anula y se crea otro.
 */
export default function EnlaceParaCompartir({ enlace, mensaje }: { enlace: string; mensaje: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
    } catch {
      // Sin permiso para el portapapeles: el texto sigue ahí para copiarlo a mano.
      setCopiado(false);
    }
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${mensaje}\n${enlace}`)}`;

  return (
    <div className="aviso-ok space-y-3">
      <p className="font-semibold">Enlace creado. Cópialo ahora: después no se puede volver a ver.</p>
      <input
        readOnly
        value={enlace}
        onFocus={(evento) => evento.currentTarget.select()}
        className="entrada font-mono text-sm"
        aria-label="Enlace"
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copiar} className="boton">
          {copiado ? '¡Copiado!' : 'Copiar enlace'}
        </button>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="boton-secundario">
          Mandar por WhatsApp
        </a>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';

/**
 * useDebounce: Retrasa la actualización de un valor hasta que el usuario deje de escribir.
 * Optimizado para "Modo Tostadora": evita congelar la UI y el hilo principal en CPUs antiguas
 * al filtrar listas grandes de socios, cargos o recibos.
 * 
 * @param {any} value - Valor que cambia con frecuencia (ej. input de búsqueda)
 * @param {number} delay - Retraso en milisegundos (default: 300ms)
 * @returns {any} debouncedValue
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

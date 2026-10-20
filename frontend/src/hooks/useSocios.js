import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { sociosRoute, sociosDuenosRoute } from "../utils/APIroutes";
import useAuth from "./authHooks";

/**
 * Custom Hook: useSocios
 * Provee almacenamiento en caché inteligente mediante TanStack Query v5.
 * Elimina las peticiones redundantes (spam 429) al navegar entre vistas,
 * conservando los datos frescos durante 5 minutos (staleTime: 300,000 ms).
 */
export function useSocios() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const idAsoc = auth?.id_asociacion || auth?.asociacion?.id_asociacion;

  const query = useQuery({
    queryKey: ["socios", idAsoc],
    queryFn: async () => {
      const { data } = await axios.get(sociosRoute, auth.config);
      return Array.isArray(data) ? data : data.socios || [];
    },
    enabled: !!auth?.token && !!idAsoc,
    staleTime: 5 * 60 * 1000,
  });

  const invalidateSocios = () =>
    queryClient.invalidateQueries({
      queryKey: ["socios", idAsoc],
    });

  return {
    socios: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidateSocios,
  };
}

/**
 * Custom Hook: useDuenos
 * Caché de propietarios únicos para vinculación de múltiples casetas
 */
export function useDuenos() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const idAsoc = auth?.id_asociacion || auth?.asociacion?.id_asociacion;

  const query = useQuery({
    queryKey: ["duenos", idAsoc],
    queryFn: async () => {
      const { data } = await axios.get(sociosDuenosRoute, auth.config);
      return data.duenos || [];
    },
    enabled: !!auth?.token && !!idAsoc,
    staleTime: 5 * 60 * 1000,
  });

  const invalidateDuenos = () =>
    queryClient.invalidateQueries({
      queryKey: ["duenos", idAsoc],
    });

  return {
    duenos: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    invalidateDuenos,
  };
}

export default useSocios;

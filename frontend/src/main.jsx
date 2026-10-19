import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'

// Configuración global de TanStack Query v5:
// - staleTime: 5 minutos (300,000 ms) para evitar re-peticiones innecesarias y mitigar errores 429
// - refetchOnWindowFocus: false para prevenir llamadas redundantes al cambiar de ventana/pestaña
// - retry: 1 para reintentar moderadamente sin bombardear el servidor
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)

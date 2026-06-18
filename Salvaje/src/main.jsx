import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './styles/globals.css'
import { AppRouter } from './Router'
import { ErrorBoundary } from './components/layout/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1A0F0A',
            color: '#FAF6F0',
            borderRadius: '12px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#2D7A4F', secondary: '#FAF6F0' },
            duration: 3000,
          },
          error: {
            iconTheme: { primary: '#8B1A1A', secondary: '#FAF6F0' },
            duration: 4000,
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>
)

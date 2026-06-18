import { Component } from 'react'

/**
 * Global error boundary — prevents a thrown render error from blanking the
 * whole app, and surfaces the error message/stack so it can be diagnosed.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Keep a console trace for debugging in dev/prod.
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center bg-salvaje-light px-6 py-10 text-center">
          <div className="w-full max-w-md">
            <h1 className="font-display text-4xl uppercase text-salvaje-dark mb-2">
              Algo salió mal
            </h1>
            <p className="font-body text-sm text-salvaje-gray mb-4">
              Ocurrió un error inesperado. Recarga la página o vuelve a intentarlo.
            </p>
            <pre className="text-left text-xs bg-salvaje-danger/5 text-salvaje-danger rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {this.state.error?.message || String(this.state.error)}
              {this.state.error?.stack ? '\n\n' + this.state.error.stack : ''}
            </pre>
            <button
              onClick={this.handleReload}
              className="mt-4 inline-flex items-center justify-center px-7 py-3 rounded-xl bg-salvaje-orange text-white font-display uppercase tracking-widest text-base hover:bg-salvaje-fire transition-colors"
            >
              Recargar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

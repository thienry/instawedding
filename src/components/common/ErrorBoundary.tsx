import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component } from 'react'

import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log unexpected runtime errors for debugging
    console.error('InstaWedding Runtime Error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-sage-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-sage-200 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-serif text-lg font-bold text-sage-900">Ops! Algo deu errado</h2>
              <p className="text-xs text-sage-800/70">
                Ocorreu uma instabilidade momentânea na exibição desta página.
              </p>
            </div>

            {this.state.error && (
              <pre className="text-[10px] text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-left overflow-x-auto max-h-28">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-3 rounded-xl border border-sage-200 text-xs font-semibold text-sage-800 hover:bg-sage-100 transition-colors">
                Tentar de novo
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-3 rounded-xl bg-sage-900 hover:bg-sage-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recarregar</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

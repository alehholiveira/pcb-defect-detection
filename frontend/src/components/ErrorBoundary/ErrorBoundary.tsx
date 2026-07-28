import { Component, type ErrorInfo, type ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches unhandled JavaScript errors anywhere in the child component tree,
 * logs them, and displays a fallback UI instead of crashing the whole app.
 * 
 * NOTE: Error Boundaries ONLY catch errors during React lifecycle methods 
 * (render, componentDidMount, etc.). They DO NOT catch:
 * - Asynchronous errors (e.g., failed `fetch` calls or setTimeout)
 * - Event handler errors (e.g., clicking a button that throws)
 * - Errors thrown in the error boundary itself
 * For async/API errors, we use local state (`error` from hooks) and Axios interceptors.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__container">
            <div className="error-boundary__icon">⚠️</div>
            <h1 className="error-boundary__title">Oops! Algo deu errado</h1>
            <p className="error-boundary__message">
              Ocorreu um erro inesperado na renderização desta página.
            </p>
            {this.state.error && (
              <pre className="error-boundary__details">
                {this.state.error.message}
              </pre>
            )}
            <button 
              type="button" 
              className="error-boundary__button" 
              onClick={this.handleReload}
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

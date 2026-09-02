import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Captura exceções de renderização e mostra uma tela amigável em vez de uma
 * página em branco. Erros de dados (React Query) são tratados nas próprias telas.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary capturou um erro:', error, info);
    }
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <div>
          <h1 className="text-lg font-semibold text-fg">Algo inesperado aconteceu</h1>
          <p className="mt-1 max-w-sm text-[13px] text-fg-muted">
            A tela encontrou um problema. Recarregar geralmente resolve.
          </p>
        </div>
        <Button onClick={this.handleReload}>Recarregar página</Button>
      </div>
    );
  }
}

import React from 'react';

// Evita a tela branca: se algum componente lançar um erro de renderização, mostra uma
// mensagem com saída em vez de derrubar a aplicação inteira.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Erro de renderização:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div role="alert" style={{ padding: 24, textAlign: 'center', color: '#fff' }}>
        <h1 style={{ color: '#ffd700', marginBottom: 12 }}>Algo deu errado</h1>
        <p style={{ marginBottom: 16 }}>
          Ocorreu um erro inesperado na tela. Sua sala continua ativa no servidor.
        </p>
        <button
          type="button"
          style={{ background: '#b22222', color: '#fff' }}
          onClick={() => { window.location.href = '/'; }}
        >
          Recarregar o jogo
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;

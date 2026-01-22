import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          maxWidth: '800px',
          margin: '0 auto',
          fontFamily: 'system-ui, sans-serif',
          background: '#fee2e2',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          marginTop: '2rem',
        }}>
          <h1 style={{ color: '#991b1b', marginBottom: '1rem' }}>⚠️ Something went wrong</h1>
          <p style={{ color: '#7f1d1d', marginBottom: '1rem' }}>
            The application encountered an error. Please check the details below:
          </p>
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', color: '#7f1d1d', fontWeight: 'bold' }}>
              Error Details
            </summary>
            <pre style={{
              background: '#fff',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              marginTop: '1rem',
              fontSize: '0.875rem',
            }}>
              {this.state.error && this.state.error.toString()}
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


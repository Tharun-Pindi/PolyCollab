import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PolyCollab UI Error Caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-6 text-on-surface">
          <div className="max-w-md w-full bg-surface border border-outline-variant rounded-2xl p-8 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-on-surface">Something went wrong</h2>
              <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                An unexpected rendering error occurred. We have captured this issue so your app won't hit a blank screen.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-3 bg-surface-container rounded-lg font-mono text-xs text-error/90 text-left overflow-x-auto border border-outline-variant/60">
                {this.state.error.message}
              </div>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg font-semibold text-sm hover:bg-surface-container transition-colors cursor-pointer"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2 bg-primary text-on-primary rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

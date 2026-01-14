import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Keep it simple: log to console for debugging.
    // You can later extend this to send to an error reporting service.
    // eslint-disable-next-line no-console
    console.error("UI crashed:", error, errorInfo);
    this.setState({ errorInfo });
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const canShowDebug = Boolean(import.meta?.env?.DEV);
    const showDetails = canShowDebug || this.state.showDetails;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
          <p className="text-sm text-gray-600 mt-2">
            The page crashed while rendering. Refreshing usually fixes it; if it keeps happening,
            there’s a bug in the UI.
          </p>

          {this.state.error && (
            <div className="mt-4 text-sm text-gray-700">
              <span className="font-semibold">Error:</span>{" "}
              <span className="font-mono">{String(this.state.error?.message || this.state.error)}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-5">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200"
              onClick={this.reset}
            >
              Try again
            </button>

            {!canShowDebug && this.state.error && (
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200"
                onClick={() => this.setState((s) => ({ ...s, showDetails: !s.showDetails }))}
              >
                {this.state.showDetails ? 'Hide details' : 'Show details'}
              </button>
            )}
          </div>

          {showDetails && (
            <div className="mt-6">
              <div className="text-xs font-semibold text-gray-700">Debug details (dev only)</div>
              <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto whitespace-pre-wrap">
                {String(this.state.error?.stack || this.state.error)}
              </pre>
              {this.state.errorInfo?.componentStack && (
                <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

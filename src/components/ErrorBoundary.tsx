import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Filter out errors from third-party scripts
    if (error.stack?.includes('inapp.js')) {
      console.warn('Suppressed error from third-party script in ErrorBoundary');
      this.setState({ hasError: false }); // Reset state to continue rendering
      return;
    }
  }

  public render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided, otherwise render default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4 font-sans">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6 font-sans">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-sans"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

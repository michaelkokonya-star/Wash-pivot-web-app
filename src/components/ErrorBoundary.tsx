import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorDetails = null;
      try {
        if (this.state.error?.message) {
          errorDetails = JSON.parse(this.state.error.message);
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl border border-black/5 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <AlertTriangle size={40} />
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight mb-4">Something went wrong</h2>
            <p className="text-black/50 mb-8 text-sm leading-relaxed">
              {errorDetails ? (
                <span>
                  A database error occurred during a <strong>{errorDetails.operationType}</strong> operation. 
                  This might be due to missing permissions or a temporary connection issue.
                </span>
              ) : (
                "An unexpected error occurred. Our team has been notified and we're working to fix it."
              )}
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-black/80 transition-all flex items-center justify-center space-x-2"
              >
                <RefreshCw size={18} />
                <span>Try Again</span>
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-4 bg-stone-100 text-black rounded-2xl font-bold hover:bg-stone-200 transition-all flex items-center justify-center space-x-2"
              >
                <Home size={18} />
                <span>Return Home</span>
              </button>
            </div>

            {errorDetails && (
              <div className="mt-8 pt-8 border-t border-black/5 text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-black/30 mb-2">Technical Details</p>
                <pre className="text-[10px] bg-stone-50 p-4 rounded-xl overflow-x-auto text-black/60 font-mono">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

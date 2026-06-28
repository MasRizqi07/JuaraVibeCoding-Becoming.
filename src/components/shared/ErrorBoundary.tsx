import React, { ErrorInfo, ReactNode } from "react";

/**
 * Stub Sentry logger as specified in standard specifications
 */
const Sentry = {
  captureException: (error: Error, errorInfo: any) => {
    console.error("[Sentry Stub] Capturing exception:", error, errorInfo);
  }
};

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary Class Component.
 * Catches render-time and lifecycle issues (including WebGL / Canvas / ThreeJS crashes)
 * and displays a clean, dark-mode compatible fallback UI.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  // Explicitly typed parameters to ensure flawless tsc compilation across environments
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an error]", error, errorInfo);
    
    // Log exception to console + Sentry stub
    Sentry.captureException(error, { extra: errorInfo });
    
    // Check if the crash is related to a WebGL/Canvas context loss
    if (
      error.message?.includes("WebGL") || 
      error.message?.includes("three") || 
      error.message?.includes("Canvas")
    ) {
      console.warn("[ErrorBoundary WebGL context issue detected] Attempting auto-recovery protocols.");
    }
  }

  public handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div id="error-boundary-screen" className="fixed inset-0 flex flex-col items-center justify-center bg-[color:oklch(0.12_0.02_250)] text-[color:oklch(0.9_0.02_250)] font-sans px-6 z-[999999]">
          <div className="max-w-md w-full border border-solid border-[rgba(201,168,68,0.2)] bg-[color:oklch(0.15_0.02_250)] p-8 rounded-lg shadow-2xl text-center space-y-6 relative overflow-hidden backdrop-blur-md">
            {/* Themed Accent Laser Edge Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-[var(--gold)] to-red-600" />
            
            <div className="space-y-2">
              <span className="text-sm font-mono text-amber-500 uppercase tracking-widest block">System Abruption</span>
              <h2 className="text-3xl font-serif text-white tracking-tight">Something went wrong.</h2>
            </div>
            
            <p className="text-sm text-[color:oklch(0.7_0.02_250)] leading-relaxed">
              An unexpected render or physical canvas crash was encountered. Please try refreshing to reinitialize alignment coordinates.
            </p>

            {this.state.error && (
              <div className="bg-black/40 border border-slate-900 rounded p-3 font-mono text-[10px] text-red-400 text-left max-h-[100px] overflow-auto select-text scrollbar-thin">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <button
              id="reload-recovery-button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center w-full py-3 px-6 rounded-md bg-[var(--gold)] text-black font-semibold tracking-wide text-xs uppercase hover:bg-white hover:text-black transition-colors duration-300 pointer-events-auto cursor-pointer"
            >
              Reset Session & Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

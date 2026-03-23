import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("App error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-8">
          <div className="bg-white rounded-[2rem] border border-[#EBE5D9] p-10 max-w-md text-center shadow-sm">
            <h2 className="text-xl font-semibold text-[#2D2A26] mb-3">Bir şeyler yanlış gitti</h2>
            <p className="text-[#6B655B] mb-6">Sayfayı yenilemeyi deneyin.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#2D2A26] text-white rounded-xl hover:bg-[#1A1816] transition-colors"
            >
              Yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

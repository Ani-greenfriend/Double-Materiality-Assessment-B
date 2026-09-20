import { Component } from 'react';

// React error boundaries must be class components — there is no hook
// equivalent. Catches render-time exceptions anywhere below it and shows
// the error instead of leaving a blank/frozen screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md bg-surface border border-border-apus rounded-2xl p-6">
            <p className="text-[15px] font-bold mb-2" style={{ color: '#D79A4C' }}>Something went wrong</p>
            <p className="text-[12.5px] text-text-secondary mb-4">
              The app hit an error it couldn't recover from. Reloading usually fixes it; if it keeps happening, the
              message below is what to report.
            </p>
            <pre className="text-[11px] text-text-secondary bg-app-black rounded-lg p-3 mb-4 overflow-auto max-h-40 whitespace-pre-wrap">
              {this.state.error.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="text-[12.5px] font-semibold rounded-lg px-4 py-2"
              style={{ background: '#4C6FFF', color: '#07070B' }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

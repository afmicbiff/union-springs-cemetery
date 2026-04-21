import React from 'react';

/**
 * React Error Boundary that catches chunk/module loading failures
 * and displays a user-friendly recovery UI instead of a white screen.
 */
export default class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleReload = () => {
    // Clear all module reload flags so the retry logic gets a fresh start
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('module-reload:')) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {}

    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || '';
      const isChunkError = /chunk|dynamically imported module|loading.*module|failed to fetch/i.test(msg);

      return (
        <div className="fixed inset-0 flex items-center justify-center p-6 bg-stone-100">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-stone-200 p-8 text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-serif font-semibold text-stone-800">
                {isChunkError ? 'Page Update Available' : 'Something Went Wrong'}
              </h2>
              <p className="text-stone-600 text-sm leading-relaxed">
                {isChunkError
                  ? 'A newer version of this page is available. Please reload to get the latest update.'
                  : 'An unexpected error occurred. Please try reloading the page.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
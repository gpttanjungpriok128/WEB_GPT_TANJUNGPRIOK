import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mb-6 text-6xl">⚠️</div>
          <h2 className="mb-3 text-2xl font-bold text-brand-900 dark:text-white">
            Terjadi Kesalahan
          </h2>
          <p className="mb-6 text-brand-600 dark:text-brand-300 leading-relaxed">
            Maaf, terjadi kesalahan yang tidak terduga. Silakan coba muat ulang
            halaman atau kembali ke beranda.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={this.handleReload} className="btn-primary">
              🔄 Muat Ulang
            </button>
            <button onClick={this.handleGoHome} className="btn-outline">
              🏠 Ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

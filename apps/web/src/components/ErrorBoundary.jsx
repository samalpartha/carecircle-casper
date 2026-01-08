import React from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the whole app
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState(prevState => ({
            error,
            errorInfo,
            errorCount: prevState.errorCount + 1
        }));

        // You can also log the error to an error reporting service here
        // Example: logErrorToService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-primary)',
                    padding: '20px'
                }}>
                    <div style={{
                        maxWidth: '600px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '32px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            margin: '0 auto 24px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px'
                        }}>
                            ⚠️
                        </div>

                        <h1 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.75rem',
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            marginBottom: '12px'
                        }}>
                            Oops! Something went wrong
                        </h1>

                        <p style={{
                            color: 'var(--text-secondary)',
                            marginBottom: '24px',
                            lineHeight: '1.6'
                        }}>
                            We encountered an unexpected error. Don't worry, your data is safe.
                            You can try refreshing the page or going back to the homepage.
                        </p>

                        {this.state.errorCount > 2 && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                padding: '12px',
                                marginBottom: '20px',
                                fontSize: '0.9rem',
                                color: 'var(--text-secondary)'
                            }}>
                                <strong>Multiple errors detected.</strong> Please try reloading the page.
                            </div>
                        )}

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details style={{
                                marginBottom: '24px',
                                textAlign: 'left',
                                background: 'var(--bg-elevated)',
                                padding: '16px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)'
                            }}>
                                <summary style={{
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    marginBottom: '12px'
                                }}>
                                    Error Details (Development Mode)
                                </summary>
                                <pre style={{
                                    fontSize: '0.75rem',
                                    color: '#ef4444',
                                    overflow: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                }}>
                                    {this.state.error.toString()}
                                    {'\n\n'}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}>
                            <button
                                onClick={this.handleReset}
                                style={{
                                    padding: '12px 24px',
                                    background: 'var(--gradient-brand)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                Try Again
                            </button>

                            <button
                                onClick={this.handleReload}
                                style={{
                                    padding: '12px 24px',
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.background = 'var(--bg-card-hover)';
                                    e.target.style.borderColor = 'var(--text-muted)';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.background = 'var(--bg-elevated)';
                                    e.target.style.borderColor = 'var(--border-light)';
                                }}
                            >
                                Reload Page
                            </button>

                            <button
                                onClick={() => window.location.href = '/'}
                                style={{
                                    padding: '12px 24px',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.color = 'var(--text-primary)';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.color = 'var(--text-secondary)';
                                    e.target.style.background = 'transparent';
                                }}
                            >
                                Go to Homepage
                            </button>
                        </div>

                        <p style={{
                            marginTop: '24px',
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)'
                        }}>
                            If this problem persists, please contact support or check the browser console for more details.
                        </p>
                    </div>
                </div>
            );
        }

        // No error, render children normally
        return this.props.children;
    }
}

export default ErrorBoundary;

import { apiRequest } from './queryClient';

interface Breadcrumb {
  timestamp: Date;
  eventType: 'navigation' | 'click' | 'api_call' | 'user_input' | 'error';
  message: string;
  data?: any;
}

interface ErrorLogOptions {
  errorType: 'client' | 'api' | 'server';
  severity?: 'info' | 'warning' | 'error' | 'critical';
  metadata?: any;
}

class ErrorLogger {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private isEnabled = true;

  constructor() {
    this.setupGlobalHandlers();
    this.trackNavigation();
  }

  private setupGlobalHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(new Error(event.reason), {
        errorType: 'client',
        severity: 'error',
        metadata: { type: 'unhandledRejection' },
      });
    });

    // Catch global errors
    window.addEventListener('error', (event) => {
      if (event.error) {
        this.logError(event.error, {
          errorType: 'client',
          severity: 'error',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        });
      }
    });
  }

  private trackNavigation() {
    // Track navigation using History API
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      this.addBreadcrumb({
        eventType: 'navigation',
        message: `Navigated to ${args[2] || window.location.pathname}`,
        data: { url: args[2] },
      });
      return originalPushState.apply(history, args);
    };

    history.replaceState = (...args) => {
      this.addBreadcrumb({
        eventType: 'navigation',
        message: `Replaced state: ${args[2] || window.location.pathname}`,
        data: { url: args[2] },
      });
      return originalReplaceState.apply(history, args);
    };

    // Track popstate (back/forward)
    window.addEventListener('popstate', () => {
      this.addBreadcrumb({
        eventType: 'navigation',
        message: `Navigated via browser history to ${window.location.pathname}`,
      });
    });
  }

  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>) {
    if (!this.isEnabled) return;

    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: new Date(),
    });

    // Keep only the latest breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  trackClick(element: string, data?: any) {
    this.addBreadcrumb({
      eventType: 'click',
      message: `Clicked: ${element}`,
      data,
    });
  }

  trackApiCall(endpoint: string, method: string, status?: number) {
    this.addBreadcrumb({
      eventType: 'api_call',
      message: `${method} ${endpoint}${status ? ` (${status})` : ''}`,
      data: { endpoint, method, status },
    });
  }

  trackUserInput(field: string, value?: any) {
    this.addBreadcrumb({
      eventType: 'user_input',
      message: `User input in ${field}`,
      data: { field, value: value ? '***' : undefined }, // Don't log actual values
    });
  }

  async logError(error: Error, options: ErrorLogOptions) {
    if (!this.isEnabled) return;

    try {
      const errorData = {
        errorType: options.errorType,
        errorMessage: error.message,
        errorStack: error.stack || null,
        url: window.location.href,
        severity: options.severity || 'error',
        metadata: options.metadata || null,
        breadcrumbs: this.breadcrumbs.map(b => ({
          timestamp: b.timestamp.toISOString(),
          eventType: b.eventType,
          message: b.message,
          data: b.data,
        })),
      };

      // Send to backend (don't await to avoid blocking)
      apiRequest('/api/errors', 'POST', errorData).catch(err => {
        // Silently fail if error logging fails
        console.error('Failed to log error to backend:', err);
      });

      // Add this error as a breadcrumb for future errors
      this.addBreadcrumb({
        eventType: 'error',
        message: error.message,
        data: { stack: error.stack?.split('\n').slice(0, 3).join('\n') },
      });
    } catch (loggingError) {
      // Don't throw if logging fails
      console.error('Error in error logger:', loggingError);
    }
  }

  // Allow temporarily disabling error tracking
  disable() {
    this.isEnabled = false;
  }

  enable() {
    this.isEnabled = true;
  }

  clearBreadcrumbs() {
    this.breadcrumbs = [];
  }
}

export const errorLogger = new ErrorLogger();

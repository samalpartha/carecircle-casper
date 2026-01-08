/**
 * Analytics and Monitoring Utilities for CareCircle
 * Tracks user interactions, errors, and performance metrics
 */

class Analytics {
    constructor() {
        this.enabled = true;
        this.sessionId = this.generateSessionId();
        this.events = [];
        this.maxEvents = 100; // Store last 100 events in memory
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Track a custom event
     */
    track(eventName, properties = {}) {
        if (!this.enabled) return;

        const event = {
            name: eventName,
            properties: {
                ...properties,
                sessionId: this.sessionId,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent
            }
        };

        // Store in memory
        this.events.push(event);
        if (this.events.length > this.maxEvents) {
            this.events.shift(); // Remove oldest event
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('📊 Analytics Event:', eventName, properties);
        }

        // Send to analytics service (placeholder)
        this.sendToAnalyticsService(event);
    }

    /**
     * Track page view
     */
    pageView(pageName, properties = {}) {
        this.track('page_view', {
            page: pageName,
            ...properties
        });
    }

    /**
     * Track user action
     */
    action(actionName, properties = {}) {
        this.track('user_action', {
            action: actionName,
            ...properties
        });
    }

    /**
     * Track wallet connection
     */
    walletConnected(address, isDemo = false) {
        this.track('wallet_connected', {
            address: this.anonymizeAddress(address),
            isDemo,
            walletType: isDemo ? 'demo' : 'casper_wallet'
        });
    }

    /**
     * Track circle creation
     */
    circleCreated(circleId, circleName) {
        this.track('circle_created', {
            circleId,
            circleName: this.anonymize(circleName)
        });
    }

    /**
     * Track task completion
     */
    taskCompleted(taskId, circleId, hasPayment = false) {
        this.track('task_completed', {
            taskId,
            circleId,
            hasPayment
        });
    }

    /**
     * Track errors
     */
    error(errorMessage, errorStack, context = {}) {
        this.track('error', {
            message: errorMessage,
            stack: errorStack,
            context,
            severity: 'error'
        });
    }

    /**
     * Track performance metrics
     */
    performance(metricName, duration, metadata = {}) {
        this.track('performance', {
            metric: metricName,
            duration,
            ...metadata
        });
    }

    /**
     * Track API calls
     */
    apiCall(endpoint, method, status, duration) {
        this.track('api_call', {
            endpoint,
            method,
            status,
            duration,
            success: status >= 200 && status < 300
        });
    }

    /**
     * Anonymize sensitive data
     */
    anonymize(value) {
        if (!value) return '';
        // Simple anonymization - replace with hash in production
        return `${value.substring(0, 3)}***`;
    }

    /**
     * Anonymize wallet address
     */
    anonymizeAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
    }

    /**
     * Send event to analytics service
     * Replace with actual analytics service (Google Analytics, Mixpanel, etc.)
     */
    async sendToAnalyticsService(event) {
        // Placeholder for actual analytics service integration
        // Example: Google Analytics 4
        // if (window.gtag) {
        //   window.gtag('event', event.name, event.properties);
        // }

        // Example: Custom analytics endpoint
        // try {
        //   await fetch('/api/analytics', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(event)
        //   });
        // } catch (err) {
        //   console.error('Failed to send analytics:', err);
        // }
    }

    /**
     * Get all events from current session
     */
    getEvents() {
        return this.events;
    }

    /**
     * Clear all events
     */
    clearEvents() {
        this.events = [];
    }

    /**
     * Export events as JSON
     */
    exportEvents() {
        return JSON.stringify(this.events, null, 2);
    }

    /**
     * Disable analytics
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Enable analytics
     */
    enable() {
        this.enabled = true;
    }
}

// Create singleton instance
const analytics = new Analytics();

// Export convenience functions
export const trackEvent = (name, properties) => analytics.track(name, properties);
export const trackPageView = (page, properties) => analytics.pageView(page, properties);
export const trackAction = (action, properties) => analytics.action(action, properties);
export const trackWalletConnected = (address, isDemo) => analytics.walletConnected(address, isDemo);
export const trackCircleCreated = (id, name) => analytics.circleCreated(id, name);
export const trackTaskCompleted = (taskId, circleId, hasPayment) => analytics.taskCompleted(taskId, circleId, hasPayment);
export const trackError = (message, stack, context) => analytics.error(message, stack, context);
export const trackPerformance = (metric, duration, metadata) => analytics.performance(metric, duration, metadata);
export const trackApiCall = (endpoint, method, status, duration) => analytics.apiCall(endpoint, method, status, duration);

export default analytics;

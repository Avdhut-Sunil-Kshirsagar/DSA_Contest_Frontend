// Internet connectivity monitoring utility
// Monitors internet connection status and handles offline/online events

export interface InternetStatus {
  isOnline: boolean;
  lastChecked: Date;
  connectionQuality: 'good' | 'poor' | 'offline';
  latency?: number;
}

export type InternetStatusCallback = (status: InternetStatus) => void;

export class InternetMonitor {
  private static instance: InternetMonitor;
  private isMonitoring = false;
  private checkInterval: number | null = null;
  private callbacks: InternetStatusCallback[] = [];
  private currentStatus: InternetStatus = {
    isOnline: navigator.onLine,
    lastChecked: new Date(),
    connectionQuality: navigator.onLine ? 'good' : 'offline'
  };
  private checkUrl = 'https://www.google.com/favicon.ico';
  private checkIntervalMs = 2000; // Check every 2 seconds during contests

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): InternetMonitor {
    if (!InternetMonitor.instance) {
      InternetMonitor.instance = new InternetMonitor();
    }
    return InternetMonitor.instance;
  }

  private setupEventListeners() {
    // Listen to browser's online/offline events
    window.addEventListener('online', () => {
      this.updateStatus({
        isOnline: true,
        lastChecked: new Date(),
        connectionQuality: 'good'
      });
    });

    window.addEventListener('offline', () => {
      this.updateStatus({
        isOnline: false,
        lastChecked: new Date(),
        connectionQuality: 'offline'
      });
    });
  }

  private updateStatus(newStatus: Partial<InternetStatus>) {
    this.currentStatus = {
      ...this.currentStatus,
      ...newStatus
    };

    // Notify all callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(this.currentStatus);
      } catch (error) {
        console.error('Error in internet status callback:', error);
      }
    });
  }

  private async checkConnectivity(): Promise<InternetStatus> {
    // Short-circuit: if browser reports offline, avoid any network calls
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        isOnline: false,
        lastChecked: new Date(),
        connectionQuality: 'offline'
      };
    }

    const startTime = Date.now();
    try {
      // Use a simple fetch request to check connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      await fetch(this.checkUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      return {
        isOnline: true,
        lastChecked: new Date(),
        connectionQuality: latency < 1000 ? 'good' : 'poor',
        latency
      };
    } catch {
      // Swallow network errors and report offline without console noise
      return {
        isOnline: false,
        lastChecked: new Date(),
        connectionQuality: 'offline'
      };
    }
  }

  startMonitoring(intervalMs: number = 2000) {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.checkIntervalMs = intervalMs;

    // Initial check
    this.performCheck();

    // Set up interval
    this.checkInterval = setInterval(() => {
      this.performCheck();
    }, this.checkIntervalMs);
  }

  stopMonitoring() {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval as unknown as number);
      this.checkInterval = null;
    }
    this.isMonitoring = false;
  }

  async performCheck() {
    const status = await this.checkConnectivity();
    this.updateStatus(status);
    return status;
  }

  subscribe(callback: InternetStatusCallback): () => void {
    this.callbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  getCurrentStatus(): InternetStatus {
    return { ...this.currentStatus };
  }

  // Method to handle contest-specific internet violations
  handleInternetViolation(contestId: string, userId: string) {
    console.warn(`Internet violation detected for user ${userId} in contest ${contestId}`);
    
    // In a real implementation, you would:
    // 1. Log the violation
    // 2. Notify the server
    // 3. Take appropriate action (warn, disqualify, etc.)
    
    // For now, we'll just log it
    const violation = {
      contestId,
      userId,
      timestamp: new Date().toISOString(),
      status: this.currentStatus
    };
    
    // Store in localStorage for now
    const violations = JSON.parse(localStorage.getItem('internet_violations') || '[]');
    violations.push(violation);
    localStorage.setItem('internet_violations', JSON.stringify(violations));
    
    return violation;
  }

  // Get violation history
  getViolationHistory(): any[] {
    return JSON.parse(localStorage.getItem('internet_violations') || '[]');
  }

  // Clear violation history
  clearViolationHistory() {
    localStorage.removeItem('internet_violations');
  }

  destroy() {
    this.stopMonitoring();
    this.callbacks = [];
  }
}

// Export singleton instance
export const internetMonitor = InternetMonitor.getInstance();






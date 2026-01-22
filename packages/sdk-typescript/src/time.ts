/**
 * @abs/sdk-typescript - Time Provider
 * 
 * Time utilities with clock skew detection.
 */

import { SkewResult } from './types';

/**
 * Time provider for consistent time handling
 */
export class TimeProvider {
  private mockTime: Date | null = null;
  
  /**
   * Get current time
   * Returns mock time if set (for testing)
   */
  now(): Date {
    return this.mockTime ?? new Date();
  }
  
  /**
   * Get current time as ISO string
   */
  nowISO(): string {
    return this.now().toISOString();
  }
  
  /**
   * Set mock time (for testing)
   */
  setMockTime(time: Date | null): void {
    this.mockTime = time;
  }
  
  /**
   * Check if timestamp is within acceptable skew
   */
  isWithinSkew(timestamp: string, maxSkewMs: number): boolean {
    const eventTime = new Date(timestamp);
    const now = this.now();
    const skew = Math.abs(now.getTime() - eventTime.getTime());
    return skew <= maxSkewMs;
  }
  
  /**
   * Calculate skew from a timestamp
   */
  calculateSkew(timestamp: string): number {
    const eventTime = new Date(timestamp);
    const now = this.now();
    return now.getTime() - eventTime.getTime();
  }
  
  /**
   * Detect skew against a reference time (simple implementation)
   * For production, this should check against NTP or server time
   */
  async detectSkew(referenceUrl?: string): Promise<SkewResult> {
    // Simple implementation - in production, fetch from NTP or server
    const now = this.now();
    
    if (referenceUrl) {
      try {
        const start = Date.now();
        const response = await fetch(referenceUrl, { method: 'HEAD' });
        const rtt = Date.now() - start;
        const serverDate = response.headers.get('date');
        
        if (serverDate) {
          const serverTime = new Date(serverDate);
          const adjustedServerTime = serverTime.getTime() + (rtt / 2);
          const skewMs = now.getTime() - adjustedServerTime;
          
          return {
            skewMs,
            acceptable: Math.abs(skewMs) <= 30000, // 30s threshold
            reference: referenceUrl,
          };
        }
      } catch {
        // Fall through to default
      }
    }
    
    // No external reference available
    return {
      skewMs: 0,
      acceptable: true,
      reference: 'local',
    };
  }
  
  /**
   * Generate a valid_until timestamp
   * @param ttlSeconds Time-to-live in seconds (default: 300 = 5 minutes)
   */
  validUntil(ttlSeconds: number = 300): string {
    const now = this.now();
    const validUntil = new Date(now.getTime() + (ttlSeconds * 1000));
    return validUntil.toISOString();
  }
  
  /**
   * Check if a timestamp has expired
   */
  isExpired(validUntil: string): boolean {
    const expirationTime = new Date(validUntil);
    return this.now() > expirationTime;
  }
}

/** Default time provider instance */
export const timeProvider = new TimeProvider();

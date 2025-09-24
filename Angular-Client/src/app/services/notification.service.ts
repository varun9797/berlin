import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number; // in milliseconds, 0 means no auto-dismiss
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<NotificationMessage[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor() { }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  showNotification(
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    duration: number = 5000
  ): void {
    const notification: NotificationMessage = {
      id: this.generateId(),
      type,
      title,
      message,
      duration
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, notification]);

    // Auto-dismiss after duration if specified
    if (duration > 0) {
      setTimeout(() => {
        this.dismissNotification(notification.id);
      }, duration);
    }
  }

  dismissNotification(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.notificationsSubject.next(filteredNotifications);
  }

  clearAllNotifications(): void {
    this.notificationsSubject.next([]);
  }

  // Convenience methods
  showSuccess(title: string, message: string, duration: number = 5000): void {
    this.showNotification('success', title, message, duration);
  }

  showError(title: string, message: string, duration: number = 8000): void {
    this.showNotification('error', title, message, duration);
  }

  showWarning(title: string, message: string, duration: number = 6000): void {
    this.showNotification('warning', title, message, duration);
  }

  showInfo(title: string, message: string, duration: number = 5000): void {
    this.showNotification('info', title, message, duration);
  }

  showSessionExpired(): void {
    this.showWarning(
      'Session Expired',
      'Your session has expired. Please login again to continue.',
      8000
    );
  }
}

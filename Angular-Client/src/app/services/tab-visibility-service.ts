import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TabVisibilityService {
  private visible$ = new BehaviorSubject<boolean>(true);

  constructor(private ngZone: NgZone) {
    this.init();
  }

  private init() {
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('visibilitychange', () => {
        const isVisible = document.visibilityState === 'visible';
        this.ngZone.run(() => {
          this.visible$.next(isVisible);
        });
      });
    });
  }

  /** Observable: subscribe to get updates */
  onVisibilityChange() {
    return this.visible$.asObservable();
  }

  /** Current state */
  isTabActive(): boolean {
    return this.visible$.value;
  }
}

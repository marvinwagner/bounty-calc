import { Pipe, PipeTransform, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { SimpleTranslateService } from './translate.service';
import { Subscription } from 'rxjs';

@Pipe({ name: 'translate', pure: false })
export class SimpleTranslatePipe implements PipeTransform, OnDestroy {
  private lastKey: string | null = null;
  private lastValue: string | null = null;
  private sub: Subscription;

  constructor(private svc: SimpleTranslateService, private cdr: ChangeDetectorRef) {
    this.sub = this.svc.currentLanguage.subscribe(() => {
      // language changed -> refresh
      this.lastValue = null;
      this.cdr.markForCheck();
    });
  }

  transform(key: string): string {
    if (!key) return '';
    if (this.lastKey === key && this.lastValue) return this.lastValue;
    const v = this.svc.instant(key);
    this.lastKey = key;
    this.lastValue = v;
    return v;
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}

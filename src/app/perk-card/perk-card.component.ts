import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-perk-card',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './perk-card.component.html',
  styleUrls: ['./perk-card.component.scss'],
})
export class PerkCardComponent {
  @Input() title = '';
  @Input() icon = 'star';
  @Input() table: any[] = [];
  @Input() index = 0; // index into table rows
  @Input() percentOverride?: number | null;
  @Input() bestiary = false; // whether to display bestiary percent instead of dmg

  @Output() indexChange = new EventEmitter<number>();

  private holdTimeout: any = null;
  private holdInterval: any = null;
  private readonly initialDelay = 400; // ms before repeating starts
  private readonly repeatRate = 120; // ms between repeats

  inc() {
    const max = Math.max(0, this.table.length - 1);
    if (this.index < max) {
      this.index++;
      this.indexChange.emit(this.index);
    }
  }

  dec() {
    if (this.index > 0) {
      this.index--;
      this.indexChange.emit(this.index);
    }
  }

  getPercentLabel(): string {
    if (this.percentOverride != null) return `${this.percentOverride.toFixed(2)}%`;
    if (!this.table || !this.table[this.index]) return '-';
    return this.bestiary ? `${this.table[this.index].bestiary.toFixed(2)}%` : `${this.table[this.index].dmg.toFixed(2)}%`;
  }

  startHold(action: 'inc' | 'dec', event: Event) {
    // prevent touch from also firing mouse events
    try {
      if (event && typeof (event as any).preventDefault === 'function') (event as any).preventDefault();
    } catch {}
    this.stopHold();
    this.holdTimeout = setTimeout(() => {
      // perform the action once then start interval
      if (action === 'inc') this.inc();
      else this.dec();
      this.holdInterval = setInterval(() => {
        if (action === 'inc') this.inc();
        else this.dec();
      }, this.repeatRate);
    }, this.initialDelay);
  }

  stopHold() {
    if (this.holdTimeout) {
      clearTimeout(this.holdTimeout);
      this.holdTimeout = null;
    }
    if (this.holdInterval) {
      clearInterval(this.holdInterval);
      this.holdInterval = null;
    }
  }

  ngOnDestroy() {
    this.stopHold();
  }
}

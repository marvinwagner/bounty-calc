import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { PerkService, PerkRow } from './services/perk.service';

interface ResultRow {
  title: string;
  upgrades: number;
  cost: number;
  fromIndex?: number;
  toIndex?: number;
  fromC?: number;
  toC?: number;
  sumFallback?: number;
}

import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { PerkCardComponent } from './perk-card/perk-card.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatGridListModule,
    MatTableModule,
    PerkCardComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  table: PerkRow[] = [];

  currentBounty = 0;

  // indexes into table for the 4 perks: Damage, Life Leech, Loot, Bestiary
  current = [0, 0, 0, 0];
  target = [0, 0, 0, 0];
  // Optional percent overrides for displaying initial values before user interacts
  currentPercentOverride: Array<number | null> = [null, null, null, null];

  results: ResultRow[] = [];
  totalCost = 0;
  remaining = 0;
  // For transposed material table
  displayedColumns: string[] = ['label', 'damage', 'life', 'loot', 'bestiary'];
  transposedData: Array<Record<string, any>> = [];

  constructor(private perkService: PerkService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.perkService.getTable().subscribe((t) => {
      this.table = t;
      // Defer updating bound arrays to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        // Load saved state if present, otherwise initialize defaults and percent overrides
        const saved = this.loadState();
        const hadSaved = !!saved;
        if (saved) {
          this.currentBounty = Number(saved.currentBounty || 0);
          this.current = (saved.current || [0, 0, 0, 0]).map((v: any) => Number(v));
          this.target = (saved.target || [0, 0, 0, 0]).map((v: any) => Number(v));
        } else {
          this.current = [0, 0, 0, 0];
          this.target = [0, 0, 0, 0];
          // populate current percent overrides from the initial CSV row (index 0)
          if (this.table.length > 0) {
            this.currentPercentOverride = [
              this.table[0].dmg,
              this.table[0].dmg,
              this.table[0].dmg,
              this.table[0].bestiary,
            ];
          }
        }
        // clamp indices to table length
        const maxIdx = Math.max(0, this.table.length - 1);
        this.current = this.current.map((v) => Math.max(0, Math.min(Number(v) || 0, maxIdx)));
        this.target = this.target.map((v) => Math.max(0, Math.min(Number(v) || 0, maxIdx)));
        // ensure view updates consistently
        this.cdr.detectChanges();
        // If we loaded saved state, auto-run the calculation so results appear immediately
        if (hadSaved) {
          // run in next tick to avoid any lingering change-detection issues
          setTimeout(() => this.calculate());
        }
      });
    });
  }

  onCurrentChange(i: number, value: any) {
    this.current[i] = Number(value);
    // user interacted; clear any percent override for this perk so the index value is shown
    this.currentPercentOverride[i] = null;
    // If desired/target is lower than current, bump target up to current
    if (this.target[i] < this.current[i]) {
      this.target[i] = this.current[i];
    }
    this.saveState();
  }

  onTargetChange(i: number, value: any) {
    this.target[i] = Number(value);
    this.saveState();
  }

  onBountyChange(value: any) {
    this.currentBounty = Number(value || 0);
    this.saveState();
  }

  private saveState() {
    try {
      const state = {
        currentBounty: this.currentBounty,
        current: this.current,
        target: this.target,
      };
      localStorage.setItem('bounty-calc-state', JSON.stringify(state));
    } catch (e) {
      // ignore storage errors
    }
  }

  private loadState(): any | null {
    try {
      const raw = localStorage.getItem('bounty-calc-state');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  calculate() {
    this.results = [];
    this.totalCost = 0;
    const titles = ['Damage', 'Life Leech', 'Loot', 'Bestiary'];
    for (let i = 0; i < 4; i++) {
      const c = Number(this.current[i] ?? 0);
      const t = Number(this.target[i] ?? 0);
      // ensure numeric and within table bounds
      const from = isNaN(c) ? 0 : Math.max(0, Math.min(c, Math.max(0, this.table.length - 1)));
      const to = isNaN(t) ? 0 : Math.max(0, Math.min(t, Math.max(0, this.table.length - 1)));
      let cost = 0;
      let fromC = 0;
      let toC = 0;
      let sumFallback = 0;
      if (this.table && this.table.length) {
        const clampedTo = Math.min(to, this.table.length - 1);
        const clampedFrom = Math.min(from, this.table.length - 1);
        fromC = Number(this.table[clampedFrom].cumulativeCost || 0);
        toC = Number(this.table[clampedTo].cumulativeCost || 0);
        for (let j = clampedFrom + 1; j <= clampedTo && j < this.table.length; j++) {
          sumFallback += Number(this.table[j].upgradeCost || 0);
        }
        // Prefer cumulative subtraction: cost is cumulative(to) - cumulative(from)
        if (!isNaN(toC) && !isNaN(fromC) && toC >= fromC) {
          cost = toC - fromC;
        } else {
          cost = sumFallback;
        }
      }
      const upgrades = Math.max(0, to - from);
      this.results.push({ title: titles[i], upgrades, cost, fromIndex: from, toIndex: to, fromC, toC, sumFallback });
      this.totalCost += cost;
    }
    this.remaining = Math.max(0, this.totalCost - (this.currentBounty || 0));
    // build transposedData for mat-table (rows: Upgrades, Cost)
    this.transposedData = [
      {
        label: 'Upgrades',
        damage: this.results[0]?.upgrades || 0,
        life: this.results[1]?.upgrades || 0,
        loot: this.results[2]?.upgrades || 0,
        bestiary: this.results[3]?.upgrades || 0,
      },
      {
        label: 'Cost',
        damage: this.results[0]?.cost || 0,
        life: this.results[1]?.cost || 0,
        loot: this.results[2]?.cost || 0,
        bestiary: this.results[3]?.cost || 0,
      },
    ];
  }
}

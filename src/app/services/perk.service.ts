import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

export interface PerkRow {
  dmg: number; // Dmg/Vamp/Loot percent
  bestiary: number; // Bestiary percent
  upgradeCost: number;
  cumulativeCost: number;
}

@Injectable({ providedIn: 'root' })
export class PerkService {
  private table$: Observable<PerkRow[]> | null = null;

  constructor(private http: HttpClient) {}

  getTable(): Observable<PerkRow[]> {
    if (!this.table$) {
      this.table$ = this.http
        .get('assets/perk-table.csv', { responseType: 'text' })
        .pipe(map((csv) => this.parseCsv(csv)), shareReplay(1));
    }
    return this.table$;
  }

  private parseCsv(csv: string): PerkRow[] {
    const lines = csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return [];

    // Parse header and build a column map so we're robust to header name changes
    const headerLine = lines.shift()!;
    const rawHeaders = headerLine.split(',').map((h) => h.trim());
    const headers = rawHeaders.map((h) => h.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());

    const findIndex = (candidates: string[]) => {
      for (const cand of candidates) {
        const idx = headers.findIndex((h) => h.includes(cand));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    // Possible header keywords for each column (support variations like 'DmgVampLoot' or 'Dmg'+'Vamp/Loot')
    const dmgIdx = findIndex(['dmgvamploot', 'dmgvamp', 'dmg', 'vamp', 'loot']);
    const bestiaryIdx = findIndex(['bestiary', 'bestiarypercent', 'bestiarypercent']);
    const upgradeCostIdx = findIndex(['upgradecost', 'upgrade', 'cost']);
    const cumulativeCostIdx = findIndex(['cumulativecost', 'cumulative']);

    // If required headers aren't found, fall back to positional parsing
    return lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      const row: PerkRow = {
        dmg: 0,
        bestiary: 0,
        upgradeCost: 0,
        cumulativeCost: 0,
      };

      if (dmgIdx !== -1) row.dmg = parseFloat(parts[dmgIdx] || '0');
      else row.dmg = parseFloat(parts[0] || '0');

      if (bestiaryIdx !== -1) row.bestiary = parseFloat(parts[bestiaryIdx] || '0');
      else row.bestiary = parseFloat(parts[1] || '0');

      if (upgradeCostIdx !== -1) row.upgradeCost = parseInt(parts[upgradeCostIdx] || '0', 10);
      else row.upgradeCost = parseInt(parts[2] || '0', 10);

      if (cumulativeCostIdx !== -1) row.cumulativeCost = parseInt(parts[cumulativeCostIdx] || '0', 10);
      else row.cumulativeCost = parseInt(parts[3] || '0', 10);

      return row;
    });
  }

  // Sum upgradeCost for upgrades needed to move from `fromIndex` to `toIndex` (inclusive of toIndex)
  costBetween(fromIndex: number, toIndex: number, table: PerkRow[]): number {
    if (toIndex <= fromIndex) return 0;
    if (!table || table.length === 0) return 0;

    // Prefer using cumulativeCost if it's present and appears valid in the CSV.
    // This avoids off-by-one mistakes and matches the CSV's reported cumulative totals.
    const clampedTo = Math.min(toIndex, table.length - 1);
    const clampedFrom = Math.min(fromIndex, table.length - 1);
    const toC = Number(table[clampedTo].cumulativeCost || 0);
    const fromC = Number(table[clampedFrom].cumulativeCost || 0);
    if (!isNaN(toC) && !isNaN(fromC) && toC >= fromC) {
      return toC - fromC;
    }

    // Fallback: sum the explicit upgradeCost values between the indices.
    let sum = 0;
    for (let i = fromIndex + 1; i <= toIndex && i < table.length; i++) {
      sum += Number(table[i].upgradeCost || 0);
    }
    return sum;
  }
}

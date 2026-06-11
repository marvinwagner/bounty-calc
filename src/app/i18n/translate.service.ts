import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SimpleTranslateService {
  private translations: Record<string, Record<string, string>> = {};
  private currentLang = new BehaviorSubject<string>('en');

  constructor(private http: HttpClient) {}

  use(lang: string): Observable<Record<string, string>> {
    if (this.translations[lang]) {
      this.currentLang.next(lang);
      return new BehaviorSubject(this.translations[lang]).asObservable();
    }
    // load JSON from assets/i18n/<lang>.json
    const path = `/assets/i18n/${lang}.json`;
    const obs = this.http.get<Record<string, string>>(path);
    obs.subscribe((data) => {
      this.translations[lang] = data || {};
      this.currentLang.next(lang);
    });
    return obs as Observable<Record<string, string>>;
  }

  get currentLanguage(): Observable<string> {
    return this.currentLang.asObservable();
  }

  instant(key: string): string {
    const lang = this.currentLang.value || 'en';
    return (this.translations[lang] && this.translations[lang][key]) || key;
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CertificateType } from './certificate-api.service';

export interface CertificationRule {
  id?: number;
  name: string;
  description: string;
  certificateType: CertificateType;
  minScore: number;
  minAttendanceRate: number;
  minHours: number;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CertificationRuleService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = 'http://localhost:8080/api/certification-rules';

  getAll(): Observable<CertificationRule[]> {
    return this.http.get<CertificationRule[]>(this.apiBase);
  }

  getById(id: number): Observable<CertificationRule> {
    return this.http.get<CertificationRule>(`${this.apiBase}/${id}`);
  }

  create(rule: CertificationRule): Observable<CertificationRule> {
    return this.http.post<CertificationRule>(this.apiBase, rule);
  }

  update(id: number, rule: CertificationRule): Observable<CertificationRule> {
    return this.http.put<CertificationRule>(`${this.apiBase}/${id}`, rule);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/${id}`);
  }
}

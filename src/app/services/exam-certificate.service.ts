import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExamQuestion {
  id?: number;
  text: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctChoice: 'A' | 'B' | 'C' | 'D';
}

export interface ExamCertificate {
  id?: number;
  title: string;
  description: string;
  minScore: number;
  active: boolean;
  questions?: ExamQuestion[];
}

@Injectable({
  providedIn: 'root'
})
export class ExamCertificateService {
  private http = inject(HttpClient);
  private apiBase = 'http://localhost:8080/api/exam-certificates';

  getAllCertificates(): Observable<ExamCertificate[]> {
    return this.http.get<ExamCertificate[]>(this.apiBase);
  }

  getActiveCertificates(): Observable<ExamCertificate[]> {
    return this.http.get<ExamCertificate[]>(`${this.apiBase}/active`);
  }

  getCertificateById(id: number): Observable<ExamCertificate> {
    return this.http.get<ExamCertificate>(`${this.apiBase}/${id}`);
  }

  createCertificate(certificate: ExamCertificate): Observable<ExamCertificate> {
    return this.http.post<ExamCertificate>(this.apiBase, certificate);
  }

  updateCertificate(id: number, certificate: ExamCertificate): Observable<ExamCertificate> {
    return this.http.put<ExamCertificate>(`${this.apiBase}/${id}`, certificate);
  }

  deleteCertificate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/${id}`);
  }
}

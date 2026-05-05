import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type CertificateType = 'INTERNSHIP' | 'COMPLETION' | 'ACHIEVEMENT' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ENGLISH';
export type CertificateStatus = 'DRAFT' | 'ISSUED' | 'REVOKED' | 'FAILED';

export interface Question {
  id?: number;
  text: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctChoice: string;
  topic?: string;
  explanation?: string;
}

export interface Certificate {
  id?: number;
  title: string;
  description: string;
  passingScore: number;
  type: string;
  active: boolean;
  durationMinutes?: number;
  questions?: Question[];
}

export interface QuizSubmission {
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  answers: { questionId: number; selectedChoice: string }[];
}

export interface QuestionCorrection {
  questionId: number;
  questionText: string;
  selectedAnswer: string;
  correctAnswer: string;
  correct: boolean;
  topic?: string;
  explanation: string;
}

export interface QuizResult {
  score: number;
  passed: boolean;
  certificateNumber?: string;
  generatedCertificateId?: number;
  message: string;
  corrections?: QuestionCorrection[];
  topicsToReview?: string[];
}

export interface GeneratedCertificate {
  id: number;
  certificateNumber: string;
  issueDate: string;
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  verificationCode: string;
  score: number;
  rating?: number;
  feedback?: string;
  certificate: Certificate;
}

export interface CertificateStats {
  totalCertificates: number;
  totalQuizAttempts: number;
  successfulAttempts: number;
  successRate: number;
  averageScore: number;
  topCertificates: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class CertificateApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = 'http://localhost:8080/api/certificates';

  // --- Admin ---
  getCertificates(page: number = 0, size: number = 5): Observable<any> {
    return this.http.get<any>(`${this.apiBase}?page=${page}&size=${size}`);
  }

  searchCertificates(keyword: string, page: number = 0, size: number = 5): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/search?keyword=${keyword}&page=${page}&size=${size}`);
  }

  getCertificateById(id: number): Observable<Certificate> {
    return this.http.get<Certificate>(`${this.apiBase}/${id}`);
  }

  createCertificate(payload: Certificate): Observable<Certificate> {
    return this.http.post<Certificate>(this.apiBase, payload);
  }

  deleteCertificate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/${id}`);
  }

  addQuestion(certId: number, question: Question): Observable<Question> {
    return this.http.post<Question>(`${this.apiBase}/${certId}/questions`, question);
  }

  getParticipants(certId: number): Observable<GeneratedCertificate[]> {
    return this.http.get<GeneratedCertificate[]>(`${this.apiBase}/${certId}/participants`);
  }

  getAllGeneratedCertificates(page: number = 0, size: number = 10): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/generated?page=${page}&size=${size}`);
  }

  searchGeneratedCertificates(keyword: string, page: number = 0, size: number = 10): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/generated/search?keyword=${keyword}&page=${page}&size=${size}`);
  }

  updateRating(id: number, rating: number, feedback: string = ''): Observable<any> {
    return this.http.post(`${this.apiBase}/generated/${id}/rating?rating=${rating}&feedback=${feedback}`, {});
  }

  getCertificateStats(): Observable<CertificateStats> {
    return this.http.get<CertificateStats>(`${this.apiBase}/stats`);
  }

  // --- Student ---
  getPublishedCertificates(page: number = 0, size: number = 2): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/published?page=${page}&size=${size}`);
  }

  submitQuiz(certId: number, submission: QuizSubmission): Observable<QuizResult> {
    return this.http.post<QuizResult>(`${this.apiBase}/${certId}/submit`, submission);
  }

  getMyCertificates(email: string): Observable<GeneratedCertificate[]> {
    return this.http.get<GeneratedCertificate[]>(`${this.apiBase}/my-certificates?email=${email}`);
  }
}

import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Download, CheckCircle, GraduationCap, ChevronRight, User, Award, BookOpen, AlertCircle, FileText, ChevronLeft, Star } from 'lucide-angular';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { CertificateApiService, Certificate, QuizSubmission, QuizResult, GeneratedCertificate } from '../services/certificate-api.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-certificate',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './certificate.component.html',
  styleUrls: ['./certificate.component.css']
})
export class CertificateComponent implements OnInit, OnDestroy {
  private certificateApi = inject(CertificateApiService);
  private static readonly SECONDS_PER_MINUTE = 60;
  private static readonly MILLISECONDS_PER_SECOND = 1000;

  readonly DownloadIcon = Download;
  readonly CheckIcon = CheckCircle;
  readonly GraduationIcon = GraduationCap;
  readonly NextIcon = ChevronRight;
  readonly UserIcon = User;
  readonly AwardIcon = Award;
  readonly BookIcon = BookOpen;
  readonly AlertIcon = AlertCircle;
  readonly AnalysisIcon = FileText;
  readonly PrevIcon = ChevronLeft;
  readonly StarIcon = Star;

  currentStep = 1; // 1: Info, 2: Selection, 3: Quiz, 4: Result
  
  availableCertificates: Certificate[] = [];
  selectedCertificate: Certificate | null = null;
  
  currentPage = 0;
  totalPages = 0;
  pageSize = 2;
  isLoading = false;
  
  userInfo = {
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  };

  currentQuestionIndex = 0;
  userAnswers: { [key: number]: string } = {};
  quizResult: QuizResult | null = null;
  reviewMode = false;

  myCertificates: GeneratedCertificate[] = [];
  showMyCertificates = false;

  // Rating
  userRating = 0;
  userFeedback = '';
  ratingSubmitted = false;
  isSubmittingRating = false;

  // Timer
  timeLeft = 0;
  private quizEndAtMs = 0;
  private timerSub?: Subscription;
  timeExpired = false;

  get passed(): boolean { return this.quizResult?.passed ?? false; }
  get score(): number { return this.quizResult?.score ?? 0; }
  get mistakes(): any[] { return []; } // Legacy compatibility
  get recommendations(): string[] { return []; } // Legacy compatibility

  get answeredCount(): number {
    return Object.keys(this.userAnswers).length;
  }

  get unansweredCount(): number {
    if (!this.selectedCertificate?.questions) return 0;
    return this.selectedCertificate.questions.length - this.answeredCount;
  }

  get unansweredQuestions(): number[] {
    if (!this.selectedCertificate?.questions) return [];
    return this.selectedCertificate.questions
      .map((q, idx) => ({ id: q.id, index: idx + 1 }))
      .filter(q => !this.userAnswers[q.id!])
      .map(q => q.index);
  }

  get formattedTime(): string {
    const minutes = Math.floor(this.timeLeft / CertificateComponent.SECONDS_PER_MINUTE);
    const seconds = this.timeLeft % CertificateComponent.SECONDS_PER_MINUTE;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  ngOnInit(): void {
    this.loadCertificates();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  loadCertificates(page: number = 0): void {
    this.isLoading = true;
    this.currentPage = page;
    this.certificateApi.getPublishedCertificates(page, this.pageSize).subscribe({
      next: (data) => {
        this.availableCertificates = data.content;
        this.totalPages = data.totalPages;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading certs', err);
        this.isLoading = false;
      }
    });
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.loadCertificates(page);
  }

  loadMyCertificates(): void {
    if (!this.userInfo.email) return;
    this.certificateApi.getMyCertificates(this.userInfo.email).subscribe({
      next: (data) => this.myCertificates = data,
      error: (err) => console.error('Error loading my certs', err)
    });
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      if (this.userInfo.firstName && this.userInfo.lastName && this.userInfo.email) {
        this.currentStep = 2;
      }
    }
  }

  startQuiz(cert: Certificate): void {
    this.selectedCertificate = cert;
    this.currentQuestionIndex = 0;
    this.userAnswers = {};
    this.currentStep = 3;
    this.reviewMode = false;
    this.timeExpired = false;
    const durationMinutes = Number(cert.durationMinutes);
    this.timeLeft = Number.isFinite(durationMinutes) && durationMinutes > 0
      ? Math.round(durationMinutes * CertificateComponent.SECONDS_PER_MINUTE)
      : 0;
    this.quizEndAtMs = Date.now() + (this.timeLeft * CertificateComponent.MILLISECONDS_PER_SECOND);
    this.startTimer();
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerSub = interval(CertificateComponent.MILLISECONDS_PER_SECOND).subscribe(() => {
      const remainingMs = this.quizEndAtMs - Date.now();
      this.timeLeft = Math.max(0, Math.ceil(remainingMs / CertificateComponent.MILLISECONDS_PER_SECOND));
      if (this.timeLeft === 0) {
        this.onTimeExpired();
      }
    });
  }

  private stopTimer(): void {
    this.timerSub?.unsubscribe();
  }

  private onTimeExpired(): void {
    this.stopTimer();
    this.timeExpired = true;
    this.submitQuiz();
  }

  selectAnswer(qId: number, choice: string): void {
    this.userAnswers[qId] = choice;
  }

  nextQuestion(): void {
    if (!this.selectedCertificate?.questions) return;
    if (this.currentQuestionIndex < this.selectedCertificate.questions.length - 1) {
      this.currentQuestionIndex++;
    } else {
      this.reviewMode = true;
    }
  }

  prevQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  jumpToQuestion(index: number): void {
    this.currentQuestionIndex = index - 1;
    this.reviewMode = false;
  }

  submitQuiz(): void {
    if (!this.selectedCertificate?.id) return;

    const answers = Object.keys(this.userAnswers).map(qId => ({
      questionId: Number(qId),
      selectedChoice: this.userAnswers[Number(qId)]
    }));

    const submission: QuizSubmission = {
      studentFirstName: this.userInfo.firstName,
      studentLastName: this.userInfo.lastName,
      studentEmail: this.userInfo.email,
      answers: answers
    };

    this.certificateApi.submitQuiz(this.selectedCertificate.id, submission).subscribe({
      next: (result) => {
        this.quizResult = result;
        this.currentStep = 4;
        this.stopTimer();
      },
      error: (err) => {
        console.error('Error submitting quiz', err);
        this.stopTimer();
      }
    });
  }

  async downloadCertificatePDF() {
    if (!this.quizResult?.passed || !this.selectedCertificate) return;

    const date = new Date().toLocaleDateString('fr-FR');
    const qrContent = `Verification ID: ${this.quizResult.certificateNumber}\nCandidate: ${this.userInfo.firstName} ${this.userInfo.lastName}\nCertification: ${this.selectedCertificate.title}`;

    let qrDataUrl: string;
    try {
      qrDataUrl = await QRCode.toDataURL(qrContent, { width: 150, margin: 1 });
    } catch (err) {
      console.error('QR failed:', err);
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Design Simple et Elegant
    doc.setDrawColor(20, 150, 150);
    doc.setLineWidth(5);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.setTextColor(20, 150, 150);
    doc.text('CERTIFICAT DE RÉUSSITE', pageWidth / 2, 50, { align: 'center' });
    
    doc.setFontSize(20);
    doc.setTextColor(100, 100, 100);
    doc.text('Décerné à', pageWidth / 2, 75, { align: 'center' });

    doc.setFontSize(32);
    doc.setTextColor(0, 0, 0);
    doc.text(`${this.userInfo.firstName} ${this.userInfo.lastName}`, pageWidth / 2, 95, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text('Pour avoir brillamment réussi l\'examen de :', pageWidth / 2, 115, { align: 'center' });
    
    doc.setFontSize(24);
    doc.setTextColor(20, 150, 150);
    doc.text(this.selectedCertificate.title, pageWidth / 2, 135, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(`Score final : ${this.quizResult.score}%`, pageWidth / 2, 155, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Délivré le : ${date}`, 25, pageHeight - 25);
    doc.text(`N° de vérification : ${this.quizResult.certificateNumber}`, 25, pageHeight - 20);

    doc.addImage(qrDataUrl, 'PNG', pageWidth - 45, pageHeight - 45, 30, 30);
    doc.save(`Certificat_${this.userInfo.lastName}.pdf`);
  }

  generatePDF(): void {
    this.downloadCertificatePDF();
  }

  generateAnalysisPDF(): void {
    console.log('Analysis PDF not implemented in the new version.');
  }

  restart(): void {
    this.currentStep = 1;
    this.selectedCertificate = null;
    this.quizResult = null;
    this.userAnswers = {};
    this.userRating = 0;
    this.userFeedback = '';
    this.ratingSubmitted = false;
  }

  rate(stars: number): void {
    if (this.ratingSubmitted) return;
    this.userRating = stars;
  }

  submitRating(): void {
    if (!this.quizResult?.generatedCertificateId || this.userRating === 0 || this.ratingSubmitted) return;
    
    this.isSubmittingRating = true;
    this.certificateApi.updateRating(this.quizResult.generatedCertificateId, this.userRating, this.userFeedback).subscribe({
      next: () => {
        this.ratingSubmitted = true;
        this.isSubmittingRating = false;
      },
      error: (err) => {
        console.error('Rating failed', err);
        this.isSubmittingRating = false;
      }
    });
  }
}

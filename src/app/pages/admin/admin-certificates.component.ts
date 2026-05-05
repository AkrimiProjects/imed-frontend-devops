import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Award, Plus, Pencil, Trash2, Save, X, PlusCircle, Users, Search, RefreshCw, ChevronLeft, ChevronRight, Star, TrendingUp, CheckCircle, BarChart2, ArrowUpRight } from 'lucide-angular';
import { Certificate, CertificateApiService, CertificateStats, Question, GeneratedCertificate } from '../../services/certificate-api.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './admin-certificates.component.html',
  styleUrls: ['./admin-certificates.component.css']
})
export class AdminCertificatesComponent implements OnInit, OnDestroy {
  private readonly certificateApi = inject(CertificateApiService);
  private refreshSub?: Subscription;

  readonly AwardIcon = Award;
  readonly PlusIcon = Plus;
  readonly PencilIcon = Pencil;
  readonly TrashIcon = Trash2;
  readonly SaveIcon = Save;
  readonly XIcon = X;
  readonly PlusCircleIcon = PlusCircle;
  readonly UsersIcon = Users;
  readonly SearchIcon = Search;
  readonly RefreshIcon = RefreshCw;
  readonly PrevIcon = ChevronLeft;
  readonly NextIcon = ChevronRight;
  readonly StarIcon = Star;
  readonly TrendingUpIcon = TrendingUp;
  readonly CheckCircleIcon = CheckCircle;
  readonly BarChart2Icon = BarChart2;
  readonly ArrowUpRightIcon = ArrowUpRight;

  readonly certificates = signal<Certificate[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly searchKeyword = signal('');
  readonly isLoading = signal(false);
  readonly viewMode = signal<'templates' | 'issued'>('templates');

  // Issued Certificates
  readonly issuedCertificates = signal<GeneratedCertificate[]>([]);
  readonly issuedTotalPages = signal<number>(0);
  readonly issuedCurrentPage = signal<number>(0);
  readonly issuedSearchKeyword = signal<string>('');
  readonly issuedPageSize = 10;

  readonly certStats = signal<CertificateStats | null>(null);
  readonly topCertificates = signal<{ name: string; count: number }[]>([]);

  // Pagination
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly pageSize = 5;
  
  showEditor = false;
  showParticipants = false;
  selectedParticipants: GeneratedCertificate[] = [];
  selectedCertTitle = '';

  form: Certificate = {
    title: '',
    description: '',
    passingScore: 70,
    durationMinutes: 15,
    type: 'COMPLETION',
    active: true,
    questions: []
  };

  ngOnInit(): void {
    this.loadCertificates();
    this.loadGeneratedCertificates();
    this.loadCertificateStats();
    
    // Auto-refresh logic: check for new results every 10 seconds
    this.refreshSub = interval(10000).subscribe(() => {
      if (this.viewMode() === 'issued' && !this.showParticipants) {
        this.loadGeneratedCertificates(this.issuedCurrentPage());
      }
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadCertificates(page: number = 0): void {
    this.isLoading.set(true);
    this.currentPage.set(page);
    this.certificateApi.getCertificates(page, this.pageSize).subscribe({
      next: (data) => {
        this.certificates.set(data.content);
        this.totalPages.set(data.totalPages);
        this.totalElements.set(data.totalElements);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Erreur lors du chargement des certificats');
        this.isLoading.set(false);
      }
    });
  }

  loadGeneratedCertificates(page: number = 0): void {
    this.issuedCurrentPage.set(page);
    const keyword = this.issuedSearchKeyword().trim();

    if (keyword) {
      this.certificateApi.searchGeneratedCertificates(keyword, page, this.issuedPageSize).subscribe({
        next: (data) => {
          this.issuedCertificates.set(data.content);
          this.issuedTotalPages.set(data.totalPages);
        },
        error: () => this.errorMessage.set('Erreur lors de la recherche des résultats')
      });
    } else {
      this.certificateApi.getAllGeneratedCertificates(page, this.issuedPageSize).subscribe({
        next: (data) => {
          this.issuedCertificates.set(data.content);
          this.issuedTotalPages.set(data.totalPages);
        },
        error: () => this.errorMessage.set('Erreur lors du chargement des résultats')
      });
    }
  }

  loadCertificateStats(): void {
    this.certificateApi.getCertificateStats().subscribe({
      next: (stats) => {
        this.certStats.set(stats);
        const entries = Object.entries(stats.topCertificates || {});
        this.topCertificates.set(
          entries
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
        );
      },
      error: (err) => {
        console.error('Erreur lors du chargement des stats certificates:', err);
      }
    });
  }

  onIssuedSearch(): void {
    this.loadGeneratedCertificates(0);
  }

  onIssuedReset(): void {
    this.issuedSearchKeyword.set('');
    this.loadGeneratedCertificates(0);
  }

  onTabChange(mode: 'templates' | 'issued'): void {
    this.viewMode.set(mode);
    if (mode === 'issued') {
      this.loadGeneratedCertificates(0);
    } else {
      this.loadCertificates(0);
    }
  }

  onSearch(page: number = 0): void {
    const keyword = this.searchKeyword().trim();
    this.isLoading.set(true);
    this.currentPage.set(page);
    this.errorMessage.set('');

    this.certificateApi.searchCertificates(keyword, page, this.pageSize).subscribe({
      next: (data) => {
        this.certificates.set(data.content);
        this.totalPages.set(data.totalPages);
        this.totalElements.set(data.totalElements);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Erreur lors de la recherche');
        this.isLoading.set(false);
      }
    });
  }

  onReset(): void {
    this.searchKeyword.set('');
    this.loadCertificates(0);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    if (this.searchKeyword().trim()) {
      this.onSearch(page);
    } else {
      this.loadCertificates(page);
    }
  }

  getPages(): number[] {
    const pages = [];
    for (let i = 0; i < this.totalPages(); i++) {
      pages.push(i);
    }
    return pages;
  }

  startCreate(): void {
    this.resetForm();
    this.showEditor = true;
    this.editingId.set(null);
  }

  startEdit(item: Certificate): void {
    this.editingId.set(item.id ?? null);
    this.form = { ...item, questions: item.questions ? [...item.questions] : [] };
    this.showEditor = true;
  }

  addQuestion(): void {
    if (!this.form.questions) this.form.questions = [];
    this.form.questions.push({
      text: '',
      choiceA: '',
      choiceB: '',
      choiceC: '',
      choiceD: '',
      correctChoice: 'A',
      topic: '',
      explanation: ''
    });
  }

  removeQuestion(index: number): void {
    this.form.questions?.splice(index, 1);
  }

  save(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.editingId()) {
      // Logic for update (if backend supports it, otherwise we could just recreate for simplicity or update)
      this.certificateApi.createCertificate(this.form).subscribe({
        next: () => this.handleSuccess('Certificat mis à jour avec succès'),
        error: () => this.errorMessage.set('Erreur lors de la mise à jour')
      });
    } else {
      this.certificateApi.createCertificate(this.form).subscribe({
        next: () => this.handleSuccess('Certificat créé avec succès'),
        error: () => this.errorMessage.set('Erreur lors de la création')
      });
    }
  }

  remove(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce certificat ?')) {
      this.certificateApi.deleteCertificate(id).subscribe({
        next: () => this.handleSuccess('Certificat supprimé avec succès'),
        error: () => this.errorMessage.set('Erreur lors de la suppression')
      });
    }
  }

  handleSuccess(msg: string): void {
    this.successMessage.set(msg);
    this.cancel();
    this.loadCertificates(0); // Nouveau certificat : revenir à la première page
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  viewParticipants(cert: Certificate): void {
    if (!cert.id) return;
    this.selectedCertTitle = cert.title;
    this.certificateApi.getParticipants(cert.id).subscribe({
      next: (data) => {
        this.selectedParticipants = data;
        this.showParticipants = true;
      },
      error: () => this.errorMessage.set('Erreur lors du chargement des participants')
    });
  }

  closeParticipants(): void {
    this.showParticipants = false;
    this.selectedParticipants = [];
  }

  cancel(): void {
    this.showEditor = false;
    this.editingId.set(null);
    this.resetForm();
  }

  resetForm(): void {
    this.form = {
      title: '',
      description: '',
      passingScore: 70,
      durationMinutes: 15,
      type: 'COMPLETION',
      active: true,
      questions: []
    };
    this.errorMessage.set('');
  }
}

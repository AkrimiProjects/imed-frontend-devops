import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Award, Plus, Pencil, Trash2, Save, X, PlusCircle, Trash } from 'lucide-angular';
import { ExamCertificate, ExamCertificateService, ExamQuestion } from '../../services/exam-certificate.service';

@Component({
  selector: 'app-admin-exam-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900">Certificate <span class="text-teal-600 underline">Exams</span></h1>
          <p class="text-slate-500 mt-1">Manage certificate definitions and their QCU questions.</p>
        </div>
        <button (click)="startCreate()" class="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-teal-100">
          <lucide-icon [name]="PlusIcon" class="h-5 w-5"></lucide-icon>
          Create New Exam
        </button>
      </div>

      <div *ngIf="errorMessage()" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
        {{ errorMessage() }}
      </div>

      <div *ngIf="successMessage()" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
        {{ successMessage() }}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- List of Exams -->
        <div class="space-y-4">
          <div *ngFor="let cert of certificates()" 
               class="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
               [class.border-teal-500]="editingId() === cert.id"
               (click)="startEdit(cert)">
            <div class="flex items-center justify-between mb-2">
              <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                ID: {{ cert.id }}
              </span>
              <div class="flex gap-2">
                <button (click)="remove(cert); $event.stopPropagation()" class="text-slate-300 hover:text-red-500 transition-colors">
                  <lucide-icon [name]="TrashIcon" class="h-4 w-4"></lucide-icon>
                </button>
              </div>
            </div>
            <h3 class="text-xl font-bold text-slate-800">{{ cert.title }}</h3>
            <p class="text-slate-500 text-sm mt-1 line-clamp-2">{{ cert.description }}</p>
            <div class="mt-4 flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="flex flex-col">
                  <span class="text-[10px] uppercase font-bold text-slate-400">Min Score</span>
                  <span class="font-black text-teal-600">{{ cert.minScore }}%</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-[10px] uppercase font-bold text-slate-400">Questions</span>
                  <span class="font-black text-slate-700">{{ cert.questions?.length || 0 }}</span>
                </div>
              </div>
              <span [class]="cert.active ? 'text-emerald-500' : 'text-slate-400'" class="text-xs font-bold uppercase tracking-widest">
                {{ cert.active ? '● Active' : '○ Inactive' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Editor -->
        <div *ngIf="showEditor" class="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl sticky top-8">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-2xl font-black text-slate-900">{{ editingId() ? 'Edit Exam' : 'Build New Exam' }}</h2>
            <button (click)="cancel()" class="text-slate-400 hover:text-slate-900 transition-colors">
              <lucide-icon [name]="XIcon" class="h-6 w-6"></lucide-icon>
            </button>
          </div>

          <form (ngSubmit)="save()" class="space-y-6">
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2 space-y-1">
                  <label class="text-xs font-black text-slate-400 uppercase tracking-widest">Exam Title</label>
                  <input [(ngModel)]="form.title" name="title" placeholder="e.g. Advanced English Proficiency" 
                         class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50" required>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-black text-slate-400 uppercase tracking-widest">Min. Passing Score (%)</label>
                  <input [(ngModel)]="form.minScore" name="minScore" type="number" 
                         class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50" required>
                </div>
                <div class="flex items-end pb-3">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="form.active" name="active" class="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500">
                    <span class="text-sm font-bold text-slate-700">Set as Active</span>
                  </label>
                </div>
              </div>
              
              <div class="space-y-1">
                <label class="text-xs font-black text-slate-400 uppercase tracking-widest">Description</label>
                <textarea [(ngModel)]="form.description" name="description" rows="2"
                          class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50"></textarea>
              </div>
            </div>

            <!-- Questions Section -->
            <div class="space-y-4 pt-4 border-t border-slate-100">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-black text-slate-900">Exam Questions (QCU)</h3>
                <button type="button" (click)="addQuestion()" class="text-teal-600 hover:text-teal-700 flex items-center gap-1 text-sm font-bold">
                  <lucide-icon [name]="PlusCircleIcon" class="h-4 w-4"></lucide-icon>
                  Add Question
                </button>
              </div>

              <div class="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <div *ngFor="let q of form.questions; let i = index" class="p-4 rounded-2xl bg-slate-50 border border-slate-100 relative group">
                  <button type="button" (click)="removeQuestion(i)" class="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <lucide-icon [name]="TrashIcon" class="h-4 w-4"></lucide-icon>
                  </button>

                  <div class="space-y-3">
                    <div class="flex gap-3">
                      <span class="h-6 w-6 rounded-full bg-slate-200 text-[10px] font-black flex items-center justify-center shrink-0">Q{{ i + 1 }}</span>
                      <input [(ngModel)]="q.text" [name]="'q-text-'+i" placeholder="Question text..." 
                             class="w-full bg-transparent border-b border-slate-200 focus:border-teal-500 outline-none pb-1 font-semibold text-slate-800">
                    </div>

                    <div class="grid grid-cols-2 gap-3 pl-9">
                      <div class="flex items-center gap-2">
                        <input type="radio" [name]="'q-correct-'+i" [(ngModel)]="q.correctChoice" value="A">
                        <input [(ngModel)]="q.choiceA" [name]="'q-a-'+i" placeholder="Choice A" class="text-xs w-full bg-white rounded-lg border border-slate-200 px-2 py-1 outline-none">
                      </div>
                      <div class="flex items-center gap-2">
                        <input type="radio" [name]="'q-correct-'+i" [(ngModel)]="q.correctChoice" value="B">
                        <input [(ngModel)]="q.choiceB" [name]="'q-b-'+i" placeholder="Choice B" class="text-xs w-full bg-white rounded-lg border border-slate-200 px-2 py-1 outline-none">
                      </div>
                      <div class="flex items-center gap-2">
                        <input type="radio" [name]="'q-correct-'+i" [(ngModel)]="q.correctChoice" value="C">
                        <input [(ngModel)]="q.choiceC" [name]="'q-c-'+i" placeholder="Choice C" class="text-xs w-full bg-white rounded-lg border border-slate-200 px-2 py-1 outline-none">
                      </div>
                      <div class="flex items-center gap-2">
                        <input type="radio" [name]="'q-correct-'+i" [(ngModel)]="q.correctChoice" value="D">
                        <input [(ngModel)]="q.choiceD" [name]="'q-d-'+i" placeholder="Choice D" class="text-xs w-full bg-white rounded-lg border border-slate-200 px-2 py-1 outline-none">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3 pt-4">
              <button type="submit" class="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-50">
                <lucide-icon [name]="SaveIcon" class="h-5 w-5"></lucide-icon>
                {{ editingId() ? 'Update Exam' : 'Publish Exam' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
  `]
})
export class AdminExamCertificatesComponent implements OnInit {
  private readonly examService = inject(ExamCertificateService);

  readonly PlusIcon = Plus;
  readonly TrashIcon = Trash2;
  readonly SaveIcon = Save;
  readonly XIcon = X;
  readonly PlusCircleIcon = PlusCircle;

  readonly certificates = signal<ExamCertificate[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  
  showEditor = false;

  form: ExamCertificate = {
    title: '',
    description: '',
    minScore: 70,
    active: true,
    questions: []
  };

  ngOnInit(): void {
    this.loadCertificates();
  }

  loadCertificates(): void {
    this.examService.getAllCertificates().subscribe({
      next: data => this.certificates.set(data),
      error: () => this.errorMessage.set('Error loading certificates')
    });
  }

  startCreate(): void {
    this.resetForm();
    this.showEditor = true;
    this.editingId.set(null);
  }

  startEdit(cert: ExamCertificate): void {
    this.editingId.set(cert.id ?? null);
    this.form = { ...cert, questions: cert.questions ? [...cert.questions] : [] };
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
      correctChoice: 'A'
    });
  }

  removeQuestion(index: number): void {
    this.form.questions?.splice(index, 1);
  }

  save(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.editingId()) {
      this.examService.updateCertificate(this.editingId()!, this.form).subscribe({
        next: () => {
          this.successMessage.set('Exam updated successfully');
          this.loadCertificates();
          this.cancel();
        },
        error: () => this.errorMessage.set('Error updating exam')
      });
    } else {
      this.examService.createCertificate(this.form).subscribe({
        next: () => {
          this.successMessage.set('Exam published successfully');
          this.loadCertificates();
          this.cancel();
        },
        error: () => this.errorMessage.set('Error creating exam')
      });
    }
  }

  remove(cert: ExamCertificate): void {
    if (!cert.id) return;
    if (confirm('Are you sure you want to delete this exam?')) {
      this.examService.deleteCertificate(cert.id).subscribe({
        next: () => {
          this.successMessage.set('Exam deleted');
          this.loadCertificates();
          if (this.editingId() === cert.id) this.cancel();
        }
      });
    }
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
      minScore: 70,
      active: true,
      questions: []
    };
  }
}

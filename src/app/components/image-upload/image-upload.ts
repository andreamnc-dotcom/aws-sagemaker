import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { AwsService } from '../../services/aws.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload.html',
  styleUrls: ['./image-upload.scss']
})
export class ImageUpload implements OnInit, OnDestroy {
  uploading = false;
  uploadedKey = '';
  showModal = false;
  showUploadToast = false;
  currentResult: any = null;
  private pollInterval: any;

  constructor(
    private awsService: AwsService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.pollInterval = setInterval(async () => {
      const results = await this.awsService.pollResults();
      if (results.length > 0) {
        this.currentResult = results[0];
        this.showModal = true;
        this.cdr.detectChanges();
      }
    }, 3000);
  }

  ngOnDestroy() {
    clearInterval(this.pollInterval);
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.uploading = true;
    this.cdr.detectChanges();
    try {
      this.uploadedKey = await this.awsService.uploadImage(file);
      this.uploading = false;
      this.uploadedKey = '';
      this.showUploadToast = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.showUploadToast = false;
        this.cdr.detectChanges();
      }, 4000);
    } catch (e) {
      this.uploading = false;
      this.cdr.detectChanges();
    }
  }

  closeModal() {
    this.showModal = false;
    this.currentResult = null;
    this.cdr.detectChanges();
  }
}
import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AwsService } from '../../services/aws.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload.html',
  styleUrls: ['./image-upload.scss']
})
export class ImageUploadComponent implements OnInit, OnDestroy {
  uploading = false;
  uploadedKey = '';
  showModal = false;
  showUploadToast = false;
  currentResult: any = null;
  private pollInterval: any;

  constructor(private awsService: AwsService, private zone: NgZone) {}

  ngOnInit() {
    this.pollInterval = setInterval(() => this.poll(), 3000);
  }

  ngOnDestroy() {
    clearInterval(this.pollInterval);
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.zone.run(() => this.uploading = true);
    try {
      this.uploadedKey = await this.awsService.uploadImage(file);
      this.zone.run(() => {
        this.uploading = false;
        this.showUploadToast = true;
        this.uploadedKey = '';
        setTimeout(() => {
          this.zone.run(() => this.showUploadToast = false);
        }, 4000);
      });
    } catch (e) {
      this.zone.run(() => this.uploading = false);
    }
  }

  async poll() {
    const results = await this.awsService.pollResults();
    if (results.length > 0) {
      this.zone.run(() => {
        this.currentResult = results[0];
        this.showModal = true;
      });
    }
  }

  closeModal() {
    this.showModal = false;
    this.currentResult = null;
  }
}
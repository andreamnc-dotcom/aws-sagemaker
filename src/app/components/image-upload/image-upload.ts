import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AwsService } from '../../services/aws.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload.html',
  styleUrl: './image-upload.scss',
})
export class ImageUploadComponent implements OnInit, OnDestroy {
  uploading = false;
  uploadedKey = '';
  notifications: any[] = [];
  private pollInterval: any;

  constructor(private awsService: AwsService) {}

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
    this.uploading = true;

    try {
      this.uploadedKey = await this.awsService.uploadImage(file);
    } finally {
      this.uploading = false;
    }
  }

  async poll() {
    const results = await this.awsService.pollResults();
    if (results.length > 0) {
      this.notifications = [...results, ...this.notifications];
    }
  }
}
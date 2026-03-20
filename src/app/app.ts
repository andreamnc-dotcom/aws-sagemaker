import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ImageUploadComponent } from './components/image-upload/image-upload';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ImageUploadComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('aws-sagemaker');
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AwsService {

  constructor(private http: HttpClient) {}

  async uploadImage(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const response = await firstValueFrom(
      this.http.post<{ key: string }>(
        `/api/upload?filename=${encodeURIComponent(file.name)}`,
        buffer,
        { headers: { 'Content-Type': file.type } }
      )
    );
    return response.key;
  }

  async pollResults(): Promise<any[]> {
    const response = await firstValueFrom(
      this.http.get<{ results: any[] }>('/api/poll')
    );
    return response.results;
  }
}
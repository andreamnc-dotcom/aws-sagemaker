import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';


@Injectable({
  providedIn: 'root',
})
export class AwsService {
  private region = 'us-east-1';
  private bucketName = '';
  private queueUrl = '';
  private s3!: S3Client;
  private sqs!: SQSClient;
  private initialized = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async init(config: { bucketName: string, queueUrl: string }) {
    this.bucketName = config.bucketName;
    this.queueUrl = config.queueUrl;
    this.s3 = new S3Client({ region: this.region });
    this.sqs = new SQSClient({ region: this.region });
    this.initialized = true;
  }

  async uploadImage(file: File): Promise<string> {
    const key = `${Date.now()}-${file.name}`;
    const buffer = await file.arrayBuffer();

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: new Uint8Array(buffer),
      ContentType: file.type
    }));

    return key;
  }

  async pollResults(): Promise<any[]> {
    const response = await this.sqs.send(new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 5,
      WaitTimeSeconds: 3
    }));

    const messages = response.Messages || [];

    for (const msg of messages) {
      await this.sqs.send(new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: msg.ReceiptHandle!
      }));
    }

    return messages.map(msg => {
      const body = JSON.parse(msg.Body!);
      return JSON.parse(body.Message);
    });
  }
}



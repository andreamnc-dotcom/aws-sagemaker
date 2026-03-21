import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

process.env['ANGULAR_SSR_ALLOWED_HOSTS'] = '*';

const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

let bucketName: string;
let queueUrl: string;
let s3: any;
let sqs: any;

async function initAws() {
  const { S3Client } = await import('@aws-sdk/client-s3');
  const { SQSClient } = await import('@aws-sdk/client-sqs');
  const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm');

  const region = 'us-east-1';
  const ssm = new SSMClient({ region });

  const getParam = async (name: string) => {
    const r = await ssm.send(new GetParameterCommand({ Name: name }));
    return r.Parameter!.Value!;
  };

  bucketName = await getParam('/learner-lab/bucket-name');
  queueUrl = await getParam('/learner-lab/queue-url');
  s3 = new S3Client({ region });
  sqs = new SQSClient({ region });
  console.log('AWS config loaded:', bucketName, queueUrl);
}

app.post('/api/upload', express.raw({ type: '*/*', limit: '10mb' }), async (req, res) => {
  try {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const filename = req.query['filename'] as string;
    const key = `${Date.now()}-${filename}`;
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: req.body,
      ContentType: req.headers['content-type']
    }));
    res.json({ key });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/poll', async (req, res) => {
  try {
    const { ReceiveMessageCommand, DeleteMessageCommand } = await import('@aws-sdk/client-sqs');
    const response = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 5,
      WaitTimeSeconds: 1
    }));

    const messages = response.Messages || [];

    for (const msg of messages) {
      await sqs.send(new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: msg.ReceiptHandle!
      }));
    }

    const results = messages.map((msg: any) => {
      const body = JSON.parse(msg.Body!);
      return JSON.parse(body.Message);
    });

    res.json({ results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT']) || 4000;
  initAws()
    .then(() => {
      app.listen(port, '0.0.0.0', (error?: Error) => {
        if (error) throw error;
        console.log(`Node Express server listening on http://localhost:${port}`);
      });
    })
    .catch((err) => {
      console.error('AWS init failed:', err.message);
      app.listen(port, '0.0.0.0', (error?: Error) => {
        if (error) throw error;
        console.log(`Node Express server listening on http://localhost:${port}`);
      });
    });
}

export const reqHandler = createNodeRequestHandler(app);
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private minioClient: Minio.Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get('MINIO_PORT', '9000')),
      useSSL: false,
      accessKey: this.configService.get('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get('MINIO_SECRET_KEY', 'minioadmin'),
    });
    this.bucketName = this.configService.get('MINIO_BUCKET', 'jacode-files');
  }

  async onModuleInit() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName);
        console.log(`✅ Created MinIO bucket: ${this.bucketName}`);
      }
    } catch (error) {
      console.warn('⚠️ MinIO not available, file storage will be database-only');
    }
  }

  /**
   * Upload file to storage
   */
  async uploadFile(
    projectId: string,
    filePath: string,
    content: Buffer | string,
  ): Promise<string> {
    const objectName = `${projectId}/${filePath}`;
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

    await this.minioClient.putObject(this.bucketName, objectName, buffer);

    return objectName;
  }

  /**
   * Download file from storage
   */
  async downloadFile(projectId: string, filePath: string): Promise<Buffer> {
    const objectName = `${projectId}/${filePath}`;
    const chunks: Buffer[] = [];

    const stream = await this.minioClient.getObject(this.bucketName, objectName);

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Delete file from storage
   */
  async deleteFile(projectId: string, filePath: string): Promise<void> {
    const objectName = `${projectId}/${filePath}`;
    await this.minioClient.removeObject(this.bucketName, objectName);
  }

  /**
   * Delete all files for a project
   */
  async deleteProjectFiles(projectId: string): Promise<void> {
    const objectsList = this.minioClient.listObjects(
      this.bucketName,
      `${projectId}/`,
      true,
    );

    const objectsToRemove: string[] = [];

    for await (const obj of objectsList) {
      if (obj.name) {
        objectsToRemove.push(obj.name);
      }
    }

    if (objectsToRemove.length > 0) {
      await this.minioClient.removeObjects(this.bucketName, objectsToRemove);
    }
  }

  /**
   * Get presigned URL for file download
   */
  async getPresignedUrl(
    projectId: string,
    filePath: string,
    expirySeconds = 3600,
  ): Promise<string> {
    const objectName = `${projectId}/${filePath}`;
    return this.minioClient.presignedGetObject(
      this.bucketName,
      objectName,
      expirySeconds,
    );
  }
}

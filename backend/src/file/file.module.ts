import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { StorageService } from './storage.service';

@Module({
  providers: [FileService, StorageService],
  controllers: [FileController],
  exports: [FileService, StorageService],
})
export class FileModule {}

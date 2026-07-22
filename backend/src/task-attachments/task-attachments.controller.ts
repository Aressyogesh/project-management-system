import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { Response } from 'express';
import { SystemRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TaskAttachmentsService } from './task-attachments.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'text/plain',
  'video/mp4',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@UseGuards(JwtAuthGuard)
@Controller()
export class TaskAttachmentsController {
  constructor(private readonly service: TaskAttachmentsService) {}

  @Get('tasks/:taskId/attachments')
  listByTask(@Param('taskId') taskId: string) {
    return this.service.findAll(taskId);
  }

  @Post('tasks/:taskId/attachments')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'attachments'),
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('File type not allowed'), false);
        }
      },
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  upload(
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.service.create(taskId, file, req.user.id);
  }

  @Get('attachments/:id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const attachment = await this.service.findOne(id);
    const filePath = join(process.cwd(), 'uploads', 'attachments', attachment.filename);
    res.download(filePath, attachment.originalName);
  }

  @Delete('attachments/:id')
  @HttpCode(204)
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

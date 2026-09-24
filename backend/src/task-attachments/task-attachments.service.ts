import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'attachments');

const ATTACHMENT_SELECT = {
  id: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  createdAt: true,
  uploadedBy: { select: { id: true, fullName: true } },
};

@Injectable()
export class TaskAttachmentsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  async create(taskId: string, file: Express.Multer.File, uploadedById: string) {
    await this.requireTask(taskId);
    return this.prisma.taskAttachment.create({
      data: {
        taskId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedById,
      },
      select: ATTACHMENT_SELECT,
    });
  }

  findAll(taskId: string) {
    return this.prisma.taskAttachment.findMany({
      where: { taskId },
      select: ATTACHMENT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const attachment = await this.prisma.taskAttachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  async remove(id: string) {
    const attachment = await this.findOne(id);
    try {
      await unlink(join(UPLOAD_DIR, attachment.filename));
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e;
    }
    await this.prisma.taskAttachment.delete({ where: { id } });
  }

  private async requireTask(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
  }
}

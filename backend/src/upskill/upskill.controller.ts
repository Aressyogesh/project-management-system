import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { mkdirSync } from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Response } from 'express';
import { SystemRole, UpskillStatus, UpskillType } from '@prisma/client';
import { UpskillService } from './upskill.service';

// Extension is server-determined from the allowed MIME type — never from originalname
// to prevent extension spoofing (e.g. shell.php sent as image/jpeg).
const EVIDENCE_MIME_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'image/png': '.png',
  'image/jpeg': '.jpg',
};

const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024;
const UPSKILL_UPLOAD_DIR = join(process.cwd(), 'uploads', 'upskill');
mkdirSync(UPSKILL_UPLOAD_DIR, { recursive: true });

interface AuthRequest {
  user: { id: string; systemRole: SystemRole };
}

@Controller('upskill')
export class UpskillController {
  constructor(private readonly upskillService: UpskillService) {}

  // ─── Check manager access (for sidebar visibility) ───────────────────────

  @Get('is-manager')
  async checkManagerAccess(@Request() req: AuthRequest) {
    const isManager = await this.upskillService.isManager(req.user.id, req.user.systemRole);
    return { isManager };
  }

  // ─── List users that can be assigned (scoped by caller role) ────────────

  @Get('assignable-users')
  assignableUsers(@Request() req: AuthRequest) {
    return this.upskillService.assignableUsers(req.user.id, req.user.systemRole);
  }

  // ─── Create Assignment (Manager/Admin only) ───────────────────────────────

  @Post('assignments')
  async create(
    @Body()
    body: {
      type: UpskillType;
      assignedToId: string;
      description: string;
      toolScript?: string;
      startDate: string;
      endDate: string;
    },
    @Request() req: AuthRequest,
  ) {
    const isManager = await this.upskillService.isManager(req.user.id, req.user.systemRole);
    if (!isManager) throw new ForbiddenException('Only managers and admins can create upskill assignments');
    return this.upskillService.createAssignment(req.user.id, body);
  }

  // ─── List Assignments ─────────────────────────────────────────────────────

  @Get('assignments')
  async findAll(
    @Query('mine') mine: string | undefined,
    @Query('status') status: UpskillStatus | undefined,
    @Query('assignedToId') assignedToId: string | undefined,
    @Query('period') period: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Request() req: AuthRequest,
  ) {
    const isEmployee = req.user.systemRole === SystemRole.EMPLOYEE;
    const pagination = { page: page ? Number(page) : 1, limit: limit ? Number(limit) : 10 };

    if (isEmployee && mine !== 'true') {
      const isManager = await this.upskillService.isManager(req.user.id, req.user.systemRole);
      if (isManager) {
        return this.upskillService.findAll(req.user.id, req.user.systemRole, { mine: false, status, assignedToId, period, ...pagination });
      }
      return this.upskillService.findAll(req.user.id, req.user.systemRole, { mine: true, status, period, ...pagination });
    }

    const isMine = mine === 'true';
    return this.upskillService.findAll(req.user.id, req.user.systemRole, { mine: isMine, status, assignedToId, period, ...pagination });
  }

  // ─── Get Assignment Detail ────────────────────────────────────────────────

  @Get('assignments/:id')
  findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.upskillService.findOne(id, req.user.id, req.user.systemRole);
  }

  // ─── Log Progress (Assigned resource only) ───────────────────────────────

  @Post('assignments/:id/progress')
  logProgress(
    @Param('id') id: string,
    @Body() body: { percentComplete: number; hoursSpent: number; notes?: string },
    @Request() req: AuthRequest,
  ) {
    return this.upskillService.logProgress(id, req.user.id, body);
  }

  // ─── Final Submission with Evidence ──────────────────────────────────────

  @Post('assignments/:id/submit')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPSKILL_UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${EVIDENCE_MIME_TYPES[file.mimetype] ?? ''}`),
      }),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype in EVIDENCE_MIME_TYPES) {
          cb(null, true);
        } else {
          cb(new Error('File type not allowed. Accepted: PDF, DOCX, PPTX, XLSX, ZIP, PNG, JPG'), false);
        }
      },
      limits: { fileSize: MAX_EVIDENCE_SIZE },
    }),
  )
  async submit(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthRequest,
  ) {
    if (!file) throw new BadRequestException('Evidence file is required');
    const filePath = join('uploads', 'upskill', file.filename);
    return this.upskillService.submitEvidence(id, req.user.id, filePath, file.originalname);
  }

  // ─── Approve ─────────────────────────────────────────────────────────────

  @Patch('assignments/:id/approve')
  @HttpCode(200)
  async approve(@Param('id') id: string, @Request() req: AuthRequest) {
    const isManager = await this.upskillService.isManager(req.user.id, req.user.systemRole);
    if (!isManager) throw new ForbiddenException('Only managers and admins can approve assignments');
    return this.upskillService.approveAssignment(id, req.user.id, req.user.systemRole);
  }

  // ─── Reject ──────────────────────────────────────────────────────────────

  @Patch('assignments/:id/reject')
  @HttpCode(200)
  async reject(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req: AuthRequest,
  ) {
    const isManager = await this.upskillService.isManager(req.user.id, req.user.systemRole);
    if (!isManager) throw new ForbiddenException('Only managers and admins can reject assignments');
    return this.upskillService.rejectAssignment(id, req.user.id, body.reason, req.user.systemRole);
  }

  // ─── Edit Assignment (ASSIGNED status only, manager/creator) ─────────────

  @Patch('assignments/:id')
  @HttpCode(200)
  async update(
    @Param('id') id: string,
    @Body() body: { assignedToId?: string; description?: string; toolScript?: string; startDate?: string; endDate?: string },
    @Request() req: AuthRequest,
  ) {
    const isManager = await this.upskillService.isManager(req.user.id, req.user.systemRole);
    if (!isManager) throw new ForbiddenException('Only managers and admins can edit upskill assignments');
    return this.upskillService.updateAssignment(id, req.user.id, req.user.systemRole, body);
  }

  // ─── Delete Assignment (ASSIGNED status only, manager/creator) ────────────

  @Delete('assignments/:id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Request() req: AuthRequest) {
    const isManager = await this.upskillService.isManager(req.user.id, req.user.systemRole);
    if (!isManager) throw new ForbiddenException('Only managers and admins can delete upskill assignments');
    await this.upskillService.deleteAssignment(id, req.user.id, req.user.systemRole);
  }

  // ─── Download Evidence ────────────────────────────────────────────────────

  @Get('assignments/:id/evidence')
  async downloadEvidence(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Res() res: Response,
  ) {
    const { filePath, fileName } = await this.upskillService.getEvidence(id, req.user.id, req.user.systemRole);
    const absolutePath = join(process.cwd(), filePath);
    res.download(absolutePath, fileName);
  }
}

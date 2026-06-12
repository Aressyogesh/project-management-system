import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

@Controller('uploads')
export class UploadsController {
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'images'),
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      fileFilter: (_req, file, cb) => {
        if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
      limits: { fileSize: MAX_IMAGE_SIZE },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    const req = res.req as Request;
    const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
    const host = req.headers['x-forwarded-host'] ?? req.get('host');
    const url = `${protocol}://${host}/api/v1/uploads/image/${file.filename}`;
    return res.json({ url });
  }

  @Get('image/:filename')
  @Public()
  serveImage(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', 'images', filename);
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).json({ message: 'Image not found' });
    });
  }

  @Get('avatar/:filename')
  @Public()
  serveAvatar(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', 'avatars', filename);
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).json({ message: 'Avatar not found' });
    });
  }
}

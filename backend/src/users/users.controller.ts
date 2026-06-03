import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { SetStatusDto } from './dto/set-status.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { UsersService } from './users.service';

const photoStorage = diskStorage({
  destination: './uploads/avatars',
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${unique}${extname(file.originalname)}`);
  },
});

@ApiTags('Users')
@ApiBearerAuth()
@Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with search and pagination' })
  findAll(@Query() query: UsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('profile')
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN, SystemRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Request() req: { user: { id: string } }) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('profile')
  @HttpCode(200)
  @Roles(SystemRole.SUPER_USER, SystemRole.ADMIN, SystemRole.EMPLOYEE)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', { storage: photoStorage, limits: { fileSize: 2 * 1024 * 1024 } }))
  updateProfile(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.updateProfile(req.user.id, dto, file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile fields' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }

  @Patch(':id/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  setStatus(
    @Param('id') id: string,
    @Body() dto: SetStatusDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.usersService.setUserStatus(id, dto.isActive, req.user.id);
  }

  @Patch(':id/photo')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload profile photo for a user' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: photoStorage, limits: { fileSize: 2 * 1024 * 1024 } }))
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateProfilePhoto(id, file.path);
  }
}

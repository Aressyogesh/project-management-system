import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSprintDto, UpdateSprintDto } from './dto/sprint.dto';

@Injectable()
export class SprintsService {
  constructor(private readonly prisma: PrismaService) {}

  findByProject(projectId: string) {
    return this.prisma.sprint.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(projectId: string, dto: CreateSprintDto) {
    return this.prisma.sprint.create({
      data: { projectId, ...dto },
    });
  }

  async update(id: string, dto: UpdateSprintDto) {
    await this.findOneOrFail(id);
    return this.prisma.sprint.update({ where: { id }, data: dto });
  }

  async setActive(id: string, projectId: string) {
    await this.findOneOrFail(id);
    await this.prisma.sprint.updateMany({
      where: { projectId },
      data: { isActive: false },
    });
    return this.prisma.sprint.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async remove(id: string) {
    await this.findOneOrFail(id);
    return this.prisma.sprint.delete({ where: { id } });
  }

  private async findOneOrFail(id: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id } });
    if (!sprint) throw new NotFoundException(`Sprint ${id} not found`);
    return sprint;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { TestCaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTestCaseDto {
  title: string;
  preconditions?: string;
  steps: string;
  expectedResult: string;
}

export interface UpdateTestCaseDto {
  title?: string;
  preconditions?: string;
  steps?: string;
  expectedResult?: string;
  actualResult?: string;
  status?: TestCaseStatus;
}

@Injectable()
export class TestCasesService {
  constructor(private prisma: PrismaService) {}

  findByWorkItem(workItemId: string) {
    return this.prisma.testCase.findMany({
      where: { workItemId },
      include: { createdBy: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(workItemId: string, createdById: string, dto: CreateTestCaseDto) {
    return this.prisma.testCase.create({
      data: { workItemId, createdById, ...dto },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
  }

  async update(id: string, dto: UpdateTestCaseDto) {
    const tc = await this.prisma.testCase.findUnique({ where: { id } });
    if (!tc) throw new NotFoundException(`Test case ${id} not found`);
    return this.prisma.testCase.update({
      where: { id },
      data: dto,
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
  }

  async remove(id: string) {
    const tc = await this.prisma.testCase.findUnique({ where: { id } });
    if (!tc) throw new NotFoundException(`Test case ${id} not found`);
    await this.prisma.testCase.delete({ where: { id } });
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Request } from '@nestjs/common';
import { TestCasesService, CreateTestCaseDto, UpdateTestCaseDto } from './test-cases.service';

@Controller()
export class TestCasesController {
  constructor(private readonly service: TestCasesService) {}

  @Get('work-items/:workItemId/test-cases')
  findAll(@Param('workItemId') workItemId: string) {
    return this.service.findByWorkItem(workItemId);
  }

  @Post('work-items/:workItemId/test-cases')
  create(
    @Param('workItemId') workItemId: string,
    @Body() dto: CreateTestCaseDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(workItemId, req.user.id, dto);
  }

  @Patch('test-cases/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTestCaseDto) {
    return this.service.update(id, dto);
  }

  @Delete('test-cases/:id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

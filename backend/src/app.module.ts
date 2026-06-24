import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { MilestonesModule } from './milestones/milestones.module';
import { ProjectMembersModule } from './project-members/project-members.module';
import { TaskAttachmentsModule } from './task-attachments/task-attachments.module';
import { TaskAllocationsModule } from './task-allocations/task-allocations.module';
import { TaskCommentsModule } from './task-comments/task-comments.module';
import { TaskListsModule } from './task-lists/task-lists.module';
import { TasksModule } from './tasks/tasks.module';
import { ProjectsModule } from './projects/projects.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { DepartmentsModule } from './departments/departments.module';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { SprintsModule } from './sprints/sprints.module';
import { WorkItemsModule } from './work-items/work-items.module';
import { TimesheetEntriesModule } from './timesheet-entries/timesheet-entries.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { KpiRecordsModule } from './kpi-records/kpi-records.module';
import { SelfLogsModule } from './self-logs/self-logs.module';
import { UploadsModule } from './uploads/uploads.module';
import { BusinessUnitsModule } from './business-units/business-units.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { BoardColumnConfigsModule } from './board-column-configs/board-column-configs.module';
import { TestCasesModule } from './test-cases/test-cases.module';
import { HealthModule } from './health/health.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AutomationModule } from './automation-services/automation.module';
import { GithubWebhookModule } from './github-webhook/github-webhook.module';
import { UpskillModule } from './upskill/upskill.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'global', ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    DashboardModule,
    SettingsModule,
    DepartmentsModule,
    UsersModule,
    ClientsModule,
    ProjectsModule,
    ProjectMembersModule,
    MilestonesModule,
    TaskListsModule,
    TasksModule,
    TaskAttachmentsModule,
    TaskCommentsModule,
    TaskAllocationsModule,
    SprintsModule,
    WorkItemsModule,
    TimesheetEntriesModule,
    AnalyticsModule,
    KpiRecordsModule,
    SelfLogsModule,
    UploadsModule,
    BusinessUnitsModule,
    NotificationsModule,
    LeaveRequestsModule,
    BoardColumnConfigsModule,
    TestCasesModule,
    AuditLogsModule,
    AutomationModule,
    GithubWebhookModule,
    UpskillModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

import { ProjectProgress } from '../../../types/dashboard.types';

interface Props {
  projects: ProjectProgress[];
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    clamped >= 75 ? 'bg-green-500' : clamped >= 40 ? 'bg-blue-500' : 'bg-amber-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${clamped}%` }}
          data-testid="progress-bar"
        />
      </div>
      <span className="text-xs font-medium text-gray-600 w-9 text-right">{clamped}%</span>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectProgress }) {
  return (
    <div
      data-testid="project-card"
      className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 text-sm truncate" title={project.name}>
            {project.name}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{project.clientName}</p>
        </div>
        <span
          className={`ml-2 flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
            project.progress >= 75
              ? 'bg-green-50 text-green-700'
              : project.progress >= 40
              ? 'bg-blue-50 text-blue-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {project.progress}%
        </span>
      </div>

      <ProgressBar value={project.progress} />

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-500">
        <div className="flex flex-col items-center gap-0.5 bg-gray-50 rounded-lg py-1.5">
          <span className="font-semibold text-gray-700">{project.teamSize}</span>
          <span>Members</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 bg-gray-50 rounded-lg py-1.5">
          <span className="font-semibold text-gray-700">
            {project.completedTasks}/{project.totalTasks}
          </span>
          <span>Tasks</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 bg-gray-50 rounded-lg py-1.5">
          <span
            className={`font-semibold ${project.openBugs > 0 ? 'text-rose-600' : 'text-gray-700'}`}
          >
            {project.openBugs}
          </span>
          <span>Bugs</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="truncate">{project.projectManager}</span>
      </div>
    </div>
  );
}

export function ProjectProgressPanel({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <p className="text-sm text-gray-400">No active projects found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 text-base">Projects Progress</h2>
        <span className="text-xs text-gray-400">{projects.length} active project{projects.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

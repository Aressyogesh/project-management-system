interface TodayTaskWidgetProps {
  todayTask: { name: string; progress: number } | null;
  teamPerformance: { score: number; change: number };
}

export function TodayTaskWidget({ todayTask, teamPerformance }: TodayTaskWidgetProps) {
  const barCount = 20;
  const filledBars = Math.round((teamPerformance.score / 100) * barCount);

  return (
    <div className="space-y-4">
      {/* Today Task */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#cccccc]">
        <h2 className="font-semibold text-gray-800 text-base mb-3">Today Task</h2>
        {todayTask ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-700 font-medium truncate pr-2">{todayTask.name}</p>
              <span className="text-xs text-gray-500 shrink-0">{todayTask.progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-700"
                style={{ width: `${todayTask.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No task scheduled for today</p>
        )}
      </div>

      {/* Team Performance */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#cccccc]">
        <h2 className="font-semibold text-gray-800 text-base mb-3">Today Team Performance</h2>
        <p className="text-xs text-gray-400 mb-0.5">Score</p>
        <p className="text-3xl font-bold text-gray-900 tabular-nums">
          {teamPerformance.score.toFixed(2)}%
        </p>
        {teamPerformance.change > 0 && (
          <p className="text-xs text-green-600 mt-1">
            +{teamPerformance.change}% increase in team performance
          </p>
        )}
        {teamPerformance.score === 0 && (
          <p className="text-xs text-gray-400 mt-1">Data will appear as tasks are logged</p>
        )}

        <div className="mt-4">
          <div className="flex flex-wrap gap-0.5">
            {Array.from({ length: barCount }).map((_, i) => (
              <div
                key={i}
                className={`h-4 w-2 rounded-sm transition-colors ${
                  i < filledBars ? 'bg-orange-400' : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-400">Progress</span>
            <span className="text-xs text-gray-500 font-medium">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Circle, TrendingUp, ClipboardList, Wrench, Star, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface HomeHealthScoreProps {
  houseId: string;
  houseName: string;
  compact?: boolean;
}

interface HealthScoreData {
  score: number;
  completedTasks: number;
  missedTasks: number;
  totalExpectedTasks: number;
}

const POINTS_PER_TASK = 4;

const IMPROVEMENT_TIPS = [
  {
    icon: ClipboardList,
    label: "Complete seasonal maintenance tasks",
    detail: `Every task you mark done adds +${POINTS_PER_TASK} pts to your score`,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: Wrench,
    label: "Log contractor or DIY work",
    detail: "Logging service records counts as completed tasks",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Star,
    label: "Stay consistent year over year",
    detail: "Your score is cumulative — it never resets and keeps growing",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

export default function HomeHealthScore({ houseId, houseName, compact = false }: HomeHealthScoreProps) {
  const [showTips, setShowTips] = useState(false);

  const { data: scoreData, isLoading } = useQuery<HealthScoreData>({
    queryKey: ['/api/houses', houseId, 'health-score'],
    enabled: !!houseId,
  });

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-200 rounded-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!scoreData) return null;

  const { score: rawScore, completedTasks, missedTasks } = scoreData;
  const score = Math.max(0, rawScore);

  const nextMilestone = Math.ceil((score + 1) / 50) * 50;
  const tasksToNextMilestone = Math.ceil((nextMilestone - score) / POINTS_PER_TASK);

  const percentage = completedTasks > 0 ? Math.min(100, Math.round((score / Math.max(score, 200)) * 100)) : 0;

  let scoreColor = "#4a9e2f";
  let status = "Excellent";

  if (score === 0) {
    scoreColor = "#9ca3af";
    status = "Getting Started";
  } else if (score < 50) {
    scoreColor = "#e8a020";
    status = "Good";
  } else if (score < 100) {
    scoreColor = "#4a9e2f";
    status = "Great";
  } else {
    scoreColor = "#2c0f5b";
    status = "Excellent";
  }

  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  if (compact) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="text-center mb-3">
            <h3 className="font-semibold text-gray-900 text-sm truncate" data-testid={`text-house-name-${houseId}`}>
              {houseName}
            </h3>
            <p className="text-xs text-gray-500">Home Wellness Score™</p>
          </div>

          <div className="flex justify-center mb-3">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="36" stroke="#EEEDFE" strokeWidth="6" fill="none" />
                <circle
                  cx="40" cy="40" r="36"
                  stroke={scoreColor} strokeWidth="6" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: scoreColor }} data-testid={`text-score-${houseId}`}>
                  {score}
                </span>
                <span className="text-[10px] text-gray-500">{status}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>{completedTasks} Tasks Completed</span>
          </div>
          {missedTasks > 0 && (
            <div className="flex items-center justify-center gap-1 text-xs mt-1 text-red-500">
              <Circle className="w-3 h-3" />
              <span>{missedTasks} Tasks Missed</span>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowTips(v => !v)}
              className="w-full flex items-center justify-center gap-1 text-xs font-medium transition-colors"
              style={{ color: '#2c0f5b' }}
            >
              <TrendingUp className="w-3 h-3" />
              How to improve
              {showTips ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showTips && (
              <div className="mt-2 space-y-1.5">
                {score > 0 && (
                  <p className="text-[10px] text-gray-500 text-center">
                    {tasksToNextMilestone} more task{tasksToNextMilestone !== 1 ? "s" : ""} to reach {nextMilestone} pts
                  </p>
                )}
                {IMPROVEMENT_TIPS.map((tip) => (
                  <div key={tip.label} className={`flex items-start gap-1.5 rounded-lg p-1.5 ${tip.bg}`}>
                    <tip.icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${tip.color}`} />
                    <span className="text-[10px] text-gray-700 leading-snug">{tip.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg" data-testid={`text-house-name-${houseId}`}>
              {houseName}
            </h3>
            <p className="text-sm text-gray-500">Home Wellness Score™</p>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-5">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="42" stroke="#EEEDFE" strokeWidth="8" fill="none" />
              <circle
                cx="48" cy="48" r="42"
                stroke={scoreColor} strokeWidth="8" fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                strokeDashoffset={(2 * Math.PI * 42) - (percentage / 100) * (2 * Math.PI * 42)}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: scoreColor }} data-testid={`text-score-${houseId}`}>
                {score}
              </span>
              <span className="text-xs text-gray-500">{status}</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-gray-700">{completedTasks} Tasks Completed</span>
            </div>
            {missedTasks > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <Circle className="w-4 h-4" />
                <span>{missedTasks} Tasks Missed</span>
              </div>
            )}
            {score > 0 && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                {tasksToNextMilestone} more task{tasksToNextMilestone !== 1 ? "s" : ""} to reach {nextMilestone} pts
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: '#2c0f5b' }} />
            <span className="text-sm font-semibold text-gray-800">Ways to improve your score</span>
          </div>
          <div className="space-y-2">
            {IMPROVEMENT_TIPS.map((tip) => (
              <div key={tip.label} className={`flex items-start gap-3 rounded-xl p-3 ${tip.bg}`}>
                <tip.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tip.color}`} />
                <div>
                  <p className="text-sm font-medium text-gray-800">{tip.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{tip.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

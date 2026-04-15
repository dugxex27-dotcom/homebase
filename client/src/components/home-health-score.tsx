import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Circle } from "lucide-react";

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

export default function HomeHealthScore({ houseId, houseName, compact = false }: HomeHealthScoreProps) {
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

  const { score: rawScore, completedTasks, missedTasks, totalExpectedTasks } = scoreData;
  const score = Math.max(0, rawScore);
  
  const percentage = totalExpectedTasks > 0 
    ? Math.round((completedTasks / totalExpectedTasks) * 100) 
    : 0;

  let scoreColor = "#22c55e";
  let status = "Excellent";
  
  if (score === 0 && missedTasks > 0) {
    scoreColor = "#ef4444";
    status = "Needs Attention";
  } else if (percentage < 50) {
    scoreColor = "#eab308";
    status = "Good";
  } else if (percentage < 80) {
    scoreColor = "#8b5cf6";
    status = "Great";
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
            <p className="text-xs text-gray-500">Home Health Score™</p>
          </div>
          
          <div className="flex justify-center mb-3">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="#e5e7eb"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke={scoreColor}
                  strokeWidth="6"
                  fill="none"
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
          
          <div className="text-center text-xs text-gray-500 mb-2">Tasks Completed</div>
          <div className="flex items-center justify-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>{completedTasks} Tasks Completed</span>
            </div>
          </div>
          {missedTasks > 0 && (
            <div className="flex items-center justify-center gap-1 text-xs mt-1 text-red-500">
              <Circle className="w-3 h-3" />
              <span>{missedTasks} Tasks Completed</span>
            </div>
          )}
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
            <p className="text-sm text-gray-500">Home Health Score™</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="42"
                stroke="#e5e7eb"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r="42"
                stroke={scoreColor}
                strokeWidth="8"
                fill="none"
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
            <div className="text-sm text-gray-500">Tasks Completed</div>
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

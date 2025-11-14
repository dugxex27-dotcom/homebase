import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, TrendingUp, TrendingDown, CheckCircle, AlertCircle } from "lucide-react";

interface HomeHealthScoreProps {
  houseId: string;
}

interface HealthScoreData {
  score: number;
  completedTasks: number;
  missedTasks: number;
  totalExpectedTasks: number;
}

export default function HomeHealthScore({ houseId }: HomeHealthScoreProps) {
  const { data: scoreData, isLoading } = useQuery<HealthScoreData>({
    queryKey: ['/api/houses', houseId, 'health-score'],
    enabled: !!houseId,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Home Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!scoreData) return null;

  const { score, completedTasks, missedTasks, totalExpectedTasks } = scoreData;

  // Determine score color and status
  let scoreColor = "text-green-600 dark:text-green-400";
  let bgColor = "bg-green-100 dark:bg-green-900/30";
  let status = "Excellent";
  let icon = <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />;

  if (score < 0) {
    scoreColor = "text-red-600 dark:text-red-400";
    bgColor = "bg-red-100 dark:bg-red-900/30";
    status = "Needs Attention";
    icon = <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />;
  } else if (score < 20) {
    scoreColor = "text-yellow-600 dark:text-yellow-400";
    bgColor = "bg-yellow-100 dark:bg-yellow-900/30";
    status = "Good";
    icon = <TrendingUp className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />;
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 w-full">
          <Home className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Home Health Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`flex items-center justify-between p-4 rounded-lg ${bgColor} mb-3`}>
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <div className={`text-4xl font-bold ${scoreColor}`}>{score}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{status}</div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {completedTasks}/{totalExpectedTasks} tasks
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-gray-700 dark:text-gray-300">
              {completedTasks} completed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-gray-700 dark:text-gray-300">
              {missedTasks} missed
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

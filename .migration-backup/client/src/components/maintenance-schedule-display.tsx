import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, AlertCircle, DollarSign, Clock, Wrench, CheckCircle2 } from "lucide-react";

interface MaintenanceScheduleDisplayProps {
  houseId: string;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const priorityColors = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
};

const urgencyIcons = {
  critical: <AlertCircle className="h-4 w-4 text-red-600" />,
  important: <AlertCircle className="h-4 w-4 text-yellow-600" />,
  routine: <CheckCircle2 className="h-4 w-4 text-green-600" />,
};

export function MaintenanceScheduleDisplay({ houseId }: MaintenanceScheduleDisplayProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/houses", houseId, "schedule"],
    enabled: !!houseId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Schedule</CardTitle>
          <CardDescription>
            Failed to load maintenance schedule. Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data || !('schedule' in data)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Schedule Available</CardTitle>
          <CardDescription>
            Complete your household profile to generate a personalized maintenance schedule.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const schedule: any = (data as any).schedule;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Estimated Annual Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${schedule.totalEstimatedCost.min.toLocaleString()} - ${schedule.totalEstimatedCost.max.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Budget range for all maintenance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Critical Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedule.criticalItems.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedule.byPriority.high.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Important tasks to schedule
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Items Alert */}
      {schedule.criticalItems.length > 0 && (
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Critical Maintenance Required
            </CardTitle>
            <CardDescription className="text-red-700 dark:text-red-300">
              These items need immediate attention to prevent damage or safety issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedule.criticalItems.map((task: any) => (
              <div key={task.id} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg">
                <div className="mt-1">{urgencyIcons.critical}</div>
                <div className="flex-1">
                  <h4 className="font-semibold">{task.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{task.reason}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <Badge variant="outline" className="gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${task.estimatedCost.min}-${task.estimatedCost.max}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {task.estimatedDuration}
                    </Badge>
                    {task.professionalRequired && (
                      <Badge variant="secondary">Professional Required</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="by-month" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="by-month">By Month</TabsTrigger>
          <TabsTrigger value="by-priority">By Priority</TabsTrigger>
        </TabsList>

        <TabsContent value="by-month" className="space-y-4 mt-4">
          {monthNames.map((monthName, index) => {
            const monthNumber = index + 1;
            const tasks = schedule.byMonth[monthNumber] || [];
            
            if (tasks.length === 0) return null;

            return (
              <Card key={monthNumber}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {monthName}
                  </CardTitle>
                  <CardDescription>
                    {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} scheduled
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      data-testid={`task-${task.id}`}
                    >
                      <div className="mt-1">{urgencyIcons[task.urgency as keyof typeof urgencyIcons]}</div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold">{task.title}</h4>
                          <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                            {task.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                        <p className="text-sm text-muted-foreground italic mt-1">
                          {task.reason}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge variant="outline" className="gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${task.estimatedCost.min}-${task.estimatedCost.max}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {task.estimatedDuration}
                          </Badge>
                          <Badge variant="outline">{task.category}</Badge>
                          {task.diyFriendly && (
                            <Badge variant="secondary">DIY Friendly</Badge>
                          )}
                          {task.professionalRequired && (
                            <Badge variant="secondary">Professional Required</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="by-priority" className="space-y-4 mt-4">
          {(['high', 'medium', 'low'] as const).map((priority) => {
            const tasks = schedule.byPriority[priority] || [];
            
            if (tasks.length === 0) return null;

            return (
              <Card key={priority}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge className={priorityColors[priority]}>
                      {priority.toUpperCase()} PRIORITY
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="mt-1">{urgencyIcons[task.urgency as keyof typeof urgencyIcons]}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{task.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                        <p className="text-sm text-muted-foreground italic mt-1">
                          {task.reason}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge variant="outline">
                            Recommended: {monthNames[task.recommendedMonth - 1]}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${task.estimatedCost.min}-${task.estimatedCost.max}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {task.estimatedDuration}
                          </Badge>
                          <Badge variant="outline">{task.category}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}

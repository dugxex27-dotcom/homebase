import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Trophy, 
  Star, 
  Lock, 
  Snowflake, 
  Sun, 
  Leaf, 
  Cloud,
  DollarSign,
  Wrench,
  PiggyBank,
  FileText,
  Clock,
  Camera,
  CheckCircle,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Backend achievement definition with user progress
interface AchievementWithProgress {
  key: string;
  category: string;
  name: string;
  description: string;
  icon: string;
  criteria: any;
  isUnlocked: boolean;
  progress: number;
  unlockedAt?: string;
}

interface AchievementsResponse {
  achievements: AchievementWithProgress[];
}

// Icon mapping for achievements
const iconMap: Record<string, any> = {
  snowflake: Snowflake,
  sun: Sun,
  leaf: Leaf,
  cloud: Cloud,
  'dollar-sign': DollarSign,
  wrench: Wrench,
  'piggy-bank': PiggyBank,
  'file-text': FileText,
  clock: Clock,
  camera: Camera,
  trophy: Trophy,
  star: Star,
};

export default function Achievements() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithProgress | null>(null);

  const { data, isLoading } = useQuery<AchievementsResponse>({
    queryKey: ['/api/achievements'],
  });

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen" style={{ backgroundColor: '#2c0f5b' }}>
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-2 text-white">Achievements</h1>
            <p className="text-purple-200 mb-8">Loading your achievements...</p>
          </div>
        </div>
      </>
    );
  }

  const achievements = data?.achievements || [];
  
  // Count achievements by category
  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const totalCount = achievements.length;
  
  // Filter achievements by category
  const filteredAchievements = selectedCategory === "all" 
    ? achievements 
    : achievements.filter(a => a.category.toLowerCase() === selectedCategory);

  // Group stats by category
  const categoryStats = {
    seasonal: {
      unlocked: achievements.filter(a => a.category === 'Seasonal' && a.isUnlocked).length,
      total: achievements.filter(a => a.category === 'Seasonal').length,
    },
    financial: {
      unlocked: achievements.filter(a => a.category === 'Financial Savvy' && a.isUnlocked).length,
      total: achievements.filter(a => a.category === 'Financial Savvy').length,
    },
    organization: {
      unlocked: achievements.filter(a => a.category === 'Organization' && a.isUnlocked).length,
      total: achievements.filter(a => a.category === 'Organization').length,
    },
  };

  return (
    <>
      <div className="min-h-screen" style={{ backgroundColor: '#2c0f5b' }}>
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-white flex items-center gap-3">
              <Trophy className="w-10 h-10 text-yellow-400" />
              Achievements
            </h1>
            <p className="text-purple-200">
              Track your home maintenance milestones and accomplishments
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card style={{ backgroundColor: '#f2f2f2' }}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: '#6d28d9' }}>
                    {unlockedCount}/{totalCount}
                  </p>
                  <p className="text-sm" style={{ color: '#2c0f5b' }}>Total Achievements</p>
                </div>
              </CardContent>
            </Card>
            
            <Card style={{ backgroundColor: '#f2f2f2' }}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: '#3b82f6' }}>
                    {categoryStats.seasonal.unlocked}/{categoryStats.seasonal.total}
                  </p>
                  <p className="text-sm" style={{ color: '#2c0f5b' }}>Seasonal Badges</p>
                </div>
              </CardContent>
            </Card>
            
            <Card style={{ backgroundColor: '#f2f2f2' }}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: '#10b981' }}>
                    {categoryStats.financial.unlocked}/{categoryStats.financial.total}
                  </p>
                  <p className="text-sm" style={{ color: '#2c0f5b' }}>Financial Savvy</p>
                </div>
              </CardContent>
            </Card>
            
            <Card style={{ backgroundColor: '#f2f2f2' }}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: '#f59e0b' }}>
                    {categoryStats.organization.unlocked}/{categoryStats.organization.total}
                  </p>
                  <p className="text-sm" style={{ color: '#2c0f5b' }}>Organization</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-4 mb-6" style={{ backgroundColor: '#f2f2f2' }}>
              <TabsTrigger value="all" data-testid="tab-all" className="text-[#4b435c]" style={{ backgroundColor: '#e9d5ff' }}>All</TabsTrigger>
              <TabsTrigger value="seasonal" data-testid="tab-seasonal" className="text-[#4b435c]" style={{ backgroundColor: '#e9d5ff' }}>Seasonal</TabsTrigger>
              <TabsTrigger value="financial savvy" data-testid="tab-financial" className="text-[#4b435c]" style={{ backgroundColor: '#e9d5ff' }}>Financial</TabsTrigger>
              <TabsTrigger value="organization" data-testid="tab-organization" className="text-[#4b435c]" style={{ backgroundColor: '#e9d5ff' }}>Organization</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedCategory}>
              <Card style={{ backgroundColor: '#f2f2f2' }}>
                <CardHeader>
                  <CardTitle style={{ color: '#2c0f5b' }}>
                    {selectedCategory === "all" ? "All Achievements" : 
                     selectedCategory === "seasonal" ? "Seasonal Badges" :
                     selectedCategory === "financial savvy" ? "Financial Savvy Achievements" :
                     "Tracking & Organization Badges"}
                  </CardTitle>
                  <CardDescription style={{ color: '#6b7280' }}>
                    {selectedCategory === "all" ? "Complete milestones to unlock badges" :
                     selectedCategory === "seasonal" ? "Complete seasonal maintenance tasks" :
                     selectedCategory === "financial savvy" ? "Save money and track your spending" :
                     "Stay organized with records and documentation"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAchievements.map((achievement) => {
                      const IconComponent = iconMap[achievement.icon] || Trophy;
                      const isUnlocked = achievement.isUnlocked;
                      const progress = achievement.progress || 0;
                      
                      return (
                        <div
                          key={achievement.key}
                          onClick={() => setSelectedAchievement(achievement)}
                          className={`relative p-6 rounded-lg border-2 transition-all cursor-pointer hover:shadow-lg ${
                            isUnlocked
                              ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 hover:border-purple-600'
                              : 'border-gray-300 bg-white opacity-75 hover:opacity-90'
                          }`}
                          data-testid={`achievement-${achievement.key}`}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`p-3 rounded-full ${
                                isUnlocked
                                  ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                  : 'bg-gray-300 text-gray-500'
                              }`}
                            >
                              {isUnlocked ? (
                                <IconComponent className="w-6 h-6" data-testid={`icon-${achievement.key}`} />
                              ) : (
                                <Lock className="w-6 h-6" data-testid={`icon-locked-${achievement.key}`} />
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <h3 className="font-semibold mb-1" style={{ color: '#2c0f5b' }}>
                                {achievement.name}
                              </h3>
                              <p className="text-sm mb-3" style={{ color: '#6b7280' }}>
                                {achievement.description}
                              </p>
                              
                              {!isUnlocked && (
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs" style={{ color: '#6b7280' }}>
                                      Progress
                                    </span>
                                    <span className="text-xs font-semibold" style={{ color: '#6d28d9' }}>
                                      {Math.round(progress)}%
                                    </span>
                                  </div>
                                  <Progress 
                                    value={progress} 
                                    className="h-2" 
                                    data-testid={`progress-${achievement.key}`}
                                  />
                                </div>
                              )}
                              
                              {isUnlocked && (
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    className="bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                                    data-testid={`badge-unlocked-${achievement.key}`}
                                  >
                                    Unlocked
                                  </Badge>
                                  {achievement.unlockedAt && (
                                    <span className="text-xs" style={{ color: '#6b7280' }}>
                                      {new Date(achievement.unlockedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {filteredAchievements.length === 0 && (
                    <div className="text-center py-12">
                      <Lock className="w-12 h-12 mx-auto mb-4" style={{ color: '#9ca3af' }} />
                      <p className="text-lg" style={{ color: '#6b7280' }}>
                        No achievements in this category yet
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Achievement Detail Modal */}
          <Dialog open={!!selectedAchievement} onOpenChange={() => setSelectedAchievement(null)}>
            <DialogContent className="sm:max-w-[500px]" style={{ backgroundColor: '#f2f2f2' }}>
              {selectedAchievement && (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-4 mb-2">
                      <div
                        className={`p-4 rounded-full ${
                          selectedAchievement.isUnlocked
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                            : 'bg-gray-300 text-gray-500'
                        }`}
                      >
                        {selectedAchievement.isUnlocked ? (
                          (() => {
                            const Icon = iconMap[selectedAchievement.icon] || Trophy;
                            return <Icon className="w-8 h-8" />;
                          })()
                        ) : (
                          <Lock className="w-8 h-8" />
                        )}
                      </div>
                      <div>
                        <DialogTitle style={{ color: '#2c0f5b' }}>{selectedAchievement.name}</DialogTitle>
                        <Badge className={selectedAchievement.isUnlocked ? "bg-purple-500" : "bg-gray-400"}>
                          {selectedAchievement.category}
                        </Badge>
                      </div>
                    </div>
                    <DialogDescription style={{ color: '#6b7280' }}>
                      {selectedAchievement.description}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 pt-4">
                    {/* Status */}
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                        {selectedAchievement.isUnlocked ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Achievement Unlocked!
                          </>
                        ) : (
                          <>
                            <Target className="w-4 h-4 text-orange-500" />
                            In Progress
                          </>
                        )}
                      </h4>
                      {selectedAchievement.isUnlocked ? (
                        <p className="text-sm" style={{ color: '#6b7280' }}>
                          Unlocked on {new Date(selectedAchievement.unlockedAt!).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      ) : (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm" style={{ color: '#6b7280' }}>Progress</span>
                            <span className="text-sm font-semibold" style={{ color: '#6d28d9' }}>
                              {Math.round(selectedAchievement.progress)}%
                            </span>
                          </div>
                          <Progress value={selectedAchievement.progress} className="h-2" />
                        </div>
                      )}
                    </div>

                    {/* Criteria */}
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: '#2c0f5b' }}>Requirements</h4>
                      <div className="bg-white p-3 rounded-lg border" style={{ borderColor: '#e5e7eb' }}>
                        {selectedAchievement.criteria && (
                          <ul className="space-y-1 text-sm" style={{ color: '#6b7280' }}>
                            {Object.entries(selectedAchievement.criteria).map(([key, value]) => (
                              <li key={key} className="flex items-start gap-2">
                                <span className="text-purple-500">•</span>
                                <span>
                                  {key === 'seasonalTasksCount' && `Complete ${value} seasonal maintenance tasks`}
                                  {key === 'costSavingsAmount' && `Save $${value} through maintenance`}
                                  {key === 'documentsCount' && `Upload ${value} service documents`}
                                  {key === 'photosCount' && `Upload ${value} maintenance photos`}
                                  {key === 'serviceLogsCount' && `Create ${value} service log entries`}
                                  {!['seasonalTasksCount', 'costSavingsAmount', 'documentsCount', 'photosCount', 'serviceLogsCount'].includes(key) && 
                                    `${key}: ${value}`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Tips */}
                    {!selectedAchievement.isUnlocked && (
                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <p className="text-sm" style={{ color: '#6d28d9' }}>
                          <strong>Tip:</strong> Keep completing your {selectedAchievement.category.toLowerCase()} tasks to unlock this achievement!
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}

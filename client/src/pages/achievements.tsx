import { useQuery } from "@tanstack/react-query";
import { Trophy, Star, Users, Repeat, Gift, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/header";

interface Achievement {
  id: string;
  achievementType: string;
  achievementTitle: string;
  achievementDescription: string;
  unlockedAt: string;
  metadata: string | null;
}

interface AchievementsResponse {
  achievements: Achievement[];
  progress: {
    tasksCompleted: number;
    contractorsHired: number;
    currentStreak: number;
    longestStreak: number;
  };
}

export default function Achievements() {
  const { data, isLoading } = useQuery<AchievementsResponse>({
    queryKey: ['/api/achievements'],
  });

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">Achievements</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">Loading your achievements...</p>
          </div>
        </div>
      </>
    );
  }

  const achievements = data?.achievements || [];
  const progress = data?.progress || {
    tasksCompleted: 0,
    contractorsHired: 0,
    currentStreak: 0,
    longestStreak: 0,
  };

  // Define all possible achievements with their requirements
  const allAchievements = [
    {
      type: 'first_task',
      icon: Star,
      title: 'First Task Complete!',
      description: 'You completed your first maintenance task',
      unlocked: achievements.some(a => a.achievementType === 'first_task'),
      progress: progress.tasksCompleted >= 1 ? 100 : 0,
      requirement: 'Complete 1 task',
    },
    {
      type: 'monthly_streak',
      icon: Repeat,
      title: 'Streak Master!',
      description: `Complete tasks for ${progress.currentStreak || 3} months in a row`,
      unlocked: achievements.some(a => a.achievementType === 'monthly_streak'),
      progress: Math.min((progress.currentStreak / 3) * 100, 100),
      requirement: 'Complete tasks for 3 consecutive months',
    },
    {
      type: 'contractor_hired_1',
      icon: Users,
      title: 'First Hire!',
      description: 'You hired your first contractor',
      unlocked: achievements.some(a => a.achievementType === 'contractor_hired_1'),
      progress: progress.contractorsHired >= 1 ? 100 : 0,
      requirement: 'Hire 1 contractor',
    },
    {
      type: 'contractor_hired_3',
      icon: Users,
      title: 'Building Trust',
      description: 'You hired 3 contractors',
      unlocked: achievements.some(a => a.achievementType === 'contractor_hired_3'),
      progress: Math.min((progress.contractorsHired / 3) * 100, 100),
      requirement: 'Hire 3 contractors',
    },
    {
      type: 'contractor_hired_5',
      icon: Users,
      title: 'Growing Network',
      description: 'You hired 5 contractors',
      unlocked: achievements.some(a => a.achievementType === 'contractor_hired_5'),
      progress: Math.min((progress.contractorsHired / 5) * 100, 100),
      requirement: 'Hire 5 contractors',
    },
    {
      type: 'contractor_hired_10',
      icon: Trophy,
      title: 'Community Builder',
      description: 'You hired 10 contractors',
      unlocked: achievements.some(a => a.achievementType === 'contractor_hired_10'),
      progress: Math.min((progress.contractorsHired / 10) * 100, 100),
      requirement: 'Hire 10 contractors',
    },
  ];

  const referralAchievements = achievements.filter(a => a.achievementType.startsWith('referral_'));

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Achievements
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track your home maintenance milestones and accomplishments
            </p>
          </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{progress.tasksCompleted}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{progress.contractorsHired}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Contractors Hired</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{progress.currentStreak}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Month Streak</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{achievements.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Badges Earned</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievement Badges */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Achievement Badges</CardTitle>
            <CardDescription>Unlock badges by completing milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allAchievements.map((achievement) => {
                const Icon = achievement.icon;
                const isUnlocked = achievement.unlocked;
                
                return (
                  <div
                    key={achievement.type}
                    className={`relative p-6 rounded-lg border-2 transition-all ${
                      isUnlocked
                        ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                    }`}
                    data-testid={`achievement-${achievement.type}`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-full ${
                          isUnlocked
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500'
                        }`}
                      >
                        {isUnlocked ? <Icon className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{achievement.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {achievement.description}
                        </p>
                        
                        {!isUnlocked && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500">{achievement.requirement}</span>
                              <span className="text-xs text-gray-500">{Math.round(achievement.progress)}%</span>
                            </div>
                            <Progress value={achievement.progress} className="h-2" />
                          </div>
                        )}
                        
                        {isUnlocked && (
                          <Badge className="bg-purple-500 text-white">
                            Unlocked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Referral Achievements */}
        {referralAchievements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Referral Rewards
              </CardTitle>
              <CardDescription>Badges earned from successful referrals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {referralAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="p-4 rounded-lg border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
                    data-testid={`achievement-${achievement.achievementType}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{achievement.achievementTitle}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {achievement.achievementDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </>
  );
}

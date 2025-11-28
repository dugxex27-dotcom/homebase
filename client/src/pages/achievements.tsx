import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Target,
  Home
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HomeownerFeatureGate, HomeownerTrialBanner } from "@/components/homeowner-feature-gate";

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

interface House {
  id: string;
  name: string;
  address: string;
  homeownerId: string;
  climateZone: string;
  homeSystems: string[];
  isDefault: boolean;
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

// Helper function to get progress label
const getProgressLabel = (achievement: AchievementWithProgress): string => {
  const criteria = achievement.criteria;
  const progress = achievement.progress || 0;
  
  if (criteria.type === 'seasonal_tasks') {
    const requiredCount = criteria.seasonalTasksCount ?? criteria.count ?? 5;
    const current = Math.round((progress / 100) * requiredCount);
    return `${current}/${requiredCount} seasonal tasks`;
  } else if (criteria.type === 'under_budget') {
    const current = Math.round((progress / 100) * criteria.count);
    return `${current}/${criteria.count} tasks under budget`;
  } else if (criteria.type === 'total_savings') {
    const current = Math.round((progress / 100) * criteria.amount);
    return `$${current.toLocaleString()}/$${criteria.amount.toLocaleString()} saved`;
  } else if (criteria.type === 'documents_uploaded') {
    const current = Math.round((progress / 100) * criteria.count);
    return `${current}/${criteria.count} documents uploaded`;
  } else if (criteria.type === 'logs_created') {
    const current = Math.round((progress / 100) * criteria.count);
    return `${current}/${criteria.count} logs created`;
  } else if (criteria.type === 'photos_uploaded') {
    const current = Math.round((progress / 100) * criteria.count);
    return `${current}/${criteria.count} photo pairs`;
  }
  return 'Progress';
};

// Helper function to get remaining text
const getRemainingText = (achievement: AchievementWithProgress, progress: number): string => {
  const criteria = achievement.criteria;
  const progressPercent = progress || 0;
  
  if (criteria.type === 'seasonal_tasks') {
    const requiredCount = criteria.seasonalTasksCount ?? criteria.count ?? 5;
    const current = Math.round((progressPercent / 100) * requiredCount);
    const remaining = Math.max(0, requiredCount - current);
    return remaining > 0 ? `${remaining} more seasonal task${remaining !== 1 ? 's' : ''} to unlock` : 'Complete!';
  } else if (criteria.type === 'under_budget') {
    const current = Math.round((progressPercent / 100) * criteria.count);
    const remaining = Math.max(0, criteria.count - current);
    return remaining > 0 ? `${remaining} more task${remaining !== 1 ? 's' : ''} to unlock` : 'Complete!';
  } else if (criteria.type === 'total_savings') {
    const current = Math.round((progressPercent / 100) * criteria.amount);
    const remaining = Math.max(0, criteria.amount - current);
    return remaining > 0 ? `$${remaining.toLocaleString()} more in savings to unlock` : 'Complete!';
  } else if (criteria.type === 'documents_uploaded') {
    const current = Math.round((progressPercent / 100) * criteria.count);
    const remaining = Math.max(0, criteria.count - current);
    return remaining > 0 ? `${remaining} more document${remaining !== 1 ? 's' : ''} to unlock` : 'Complete!';
  } else if (criteria.type === 'logs_created') {
    const current = Math.round((progressPercent / 100) * criteria.count);
    const remaining = Math.max(0, criteria.count - current);
    return remaining > 0 ? `${remaining} more log${remaining !== 1 ? 's' : ''} to unlock` : 'Complete!';
  } else if (criteria.type === 'photos_uploaded') {
    const current = Math.round((progressPercent / 100) * criteria.count);
    const remaining = Math.max(0, criteria.count - current);
    return remaining > 0 ? `${remaining} more photo pair${remaining !== 1 ? 's' : ''} to unlock` : 'Complete!';
  }
  return '';
};

export default function Achievements() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithProgress | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<string | null>(null);
  const [selectedHouseId, setSelectedHouseId] = useState<string>("all");
  const queryClient = useQueryClient();
  const hasCheckedAchievements = useRef(false);

  // Fetch user's houses
  const { data: houses = [], isLoading: housesLoading } = useQuery<House[]>({
    queryKey: ['/api/houses'],
  });

  const { data, isLoading } = useQuery<AchievementsResponse>({
    queryKey: ['/api/achievements', selectedHouseId],
    queryFn: async () => {
      const url = selectedHouseId === "all" 
        ? '/api/achievements'
        : `/api/achievements?houseId=${selectedHouseId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch achievements');
      return response.json();
    },
  });

  // Mutation to retroactively check all past tasks for achievements
  const checkAchievementsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/achievements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to check achievements');
      return response.json();
    },
    onSuccess: () => {
      // Refresh achievements data after checking
      queryClient.invalidateQueries({ queryKey: ['/api/achievements'] });
    },
  });

  // Automatically check achievements when page loads to process historical tasks
  useEffect(() => {
    // Only run once per mount and not while another check is pending
    if (!hasCheckedAchievements.current && !checkAchievementsMutation.isPending) {
      hasCheckedAchievements.current = true;
      checkAchievementsMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #8B70D4 0%, #9B82DC 50%, #8B70D4 100%)' }}>
          <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-2 text-white">Achievements</h1>
            <p className="text-sm sm:text-base text-white mb-6 sm:mb-8">Loading your achievements...</p>
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
    referral: {
      unlocked: achievements.filter(a => a.category === 'Referral & Community' && a.isUnlocked).length,
      total: achievements.filter(a => a.category === 'Referral & Community').length,
    },
    milestones: {
      unlocked: achievements.filter(a => a.category === 'Milestones' && a.isUnlocked).length,
      total: achievements.filter(a => a.category === 'Milestones').length,
    },
    streaks: {
      unlocked: achievements.filter(a => a.category === 'Streaks' && a.isUnlocked).length,
      total: achievements.filter(a => a.category === 'Streaks').length,
    },
    special: {
      unlocked: achievements.filter(a => a.category === 'Special' && a.isUnlocked).length,
      total: achievements.filter(a => a.category === 'Special').length,
    },
  };

  return (
    <>
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #8B70D4 0%, #9B82DC 50%, #8B70D4 100%)' }}>
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-2 text-white flex items-center gap-2 sm:gap-3">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-yellow-400" />
              Achievements
            </h1>
            <p className="text-sm sm:text-base text-white">
              Track your home maintenance milestones and accomplishments
            </p>
          </div>

          {/* House Selector */}
          {!housesLoading && houses.length > 1 && (
            <div className="mb-6 sm:mb-8">
              <Card style={{ backgroundColor: '#f2f2f2' }}>
                <CardContent className="pt-4 pb-4 sm:pt-6 sm:pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Home className="w-5 h-5" style={{ color: '#2c0f5b' }} />
                      <label className="text-sm font-semibold" style={{ color: '#2c0f5b' }}>
                        Filter by Property:
                      </label>
                    </div>
                    <Select value={selectedHouseId} onValueChange={setSelectedHouseId}>
                      <SelectTrigger 
                        className="w-full sm:w-64" 
                        style={{ borderColor: '#2c0f5b' }}
                        data-testid="house-selector"
                      >
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" data-testid="house-option-all">
                          All Properties
                        </SelectItem>
                        {houses.map((house) => (
                          <SelectItem 
                            key={house.id} 
                            value={house.id}
                            data-testid={`house-option-${house.id}`}
                          >
                            {house.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedHouseId !== "all" && (
                      <p className="text-xs sm:text-sm text-white">
                        Showing achievements for {houses.find(h => h.id === selectedHouseId)?.name}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Card 
              style={{ backgroundColor: '#f2f2f2' }}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setModalCategory('all');
                setCategoryModalOpen(true);
              }}
              data-testid="card-total-achievements"
            >
              <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#6d28d9' }}>
                    {unlockedCount}/{totalCount}
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: '#2c0f5b' }}>Total Achievements</p>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              style={{ backgroundColor: '#f2f2f2' }}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setModalCategory('Seasonal');
                setCategoryModalOpen(true);
              }}
              data-testid="card-seasonal"
            >
              <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#3b82f6' }}>
                    {categoryStats.seasonal.unlocked}/{categoryStats.seasonal.total}
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: '#2c0f5b' }}>Seasonal ({categoryStats.seasonal.total})</p>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              style={{ backgroundColor: '#f2f2f2' }}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setModalCategory('Financial Savvy');
                setCategoryModalOpen(true);
              }}
              data-testid="card-financial"
            >
              <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#10b981' }}>
                    {categoryStats.financial.unlocked}/{categoryStats.financial.total}
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: '#2c0f5b' }}>Financial ({categoryStats.financial.total})</p>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              style={{ backgroundColor: '#f2f2f2' }}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setModalCategory('Organization');
                setCategoryModalOpen(true);
              }}
              data-testid="card-organization"
            >
              <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#f59e0b' }}>
                    {categoryStats.organization.unlocked}/{categoryStats.organization.total}
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: '#2c0f5b' }}>Organization ({categoryStats.organization.total})</p>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              style={{ backgroundColor: '#f2f2f2' }}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setModalCategory('Referral & Community');
                setCategoryModalOpen(true);
              }}
              data-testid="card-referral"
            >
              <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#ec4899' }}>
                    {categoryStats.referral.unlocked}/{categoryStats.referral.total}
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: '#2c0f5b' }}>Referrals ({categoryStats.referral.total})</p>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              style={{ backgroundColor: '#f2f2f2' }}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setModalCategory('Milestones');
                setCategoryModalOpen(true);
              }}
              data-testid="card-milestones"
            >
              <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#8b5cf6' }}>
                    {categoryStats.milestones.unlocked}/{categoryStats.milestones.total}
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: '#2c0f5b' }}>Milestones ({categoryStats.milestones.total})</p>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              style={{ backgroundColor: '#f2f2f2' }}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setModalCategory('Streaks');
                setCategoryModalOpen(true);
              }}
              data-testid="card-streaks"
            >
              <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#ef4444' }}>
                    {categoryStats.streaks.unlocked}/{categoryStats.streaks.total}
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: '#2c0f5b' }}>Streaks ({categoryStats.streaks.total})</p>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              style={{ backgroundColor: '#f2f2f2' }}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setModalCategory('Special');
                setCategoryModalOpen(true);
              }}
              data-testid="card-special"
            >
              <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#06b6d4' }}>
                    {categoryStats.special.unlocked}/{categoryStats.special.total}
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: '#2c0f5b' }}>Special ({categoryStats.special.total})</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6 sm:mb-8">
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-4 md:grid-cols-8 mb-4 sm:mb-6" style={{ backgroundColor: '#f2f2f2' }}>
              <TabsTrigger value="all" data-testid="tab-all" className="text-xs sm:text-sm text-[#4b435c]" style={{ backgroundColor: '#e9d5ff' }}>All</TabsTrigger>
              <TabsTrigger value="seasonal" data-testid="tab-seasonal" className="text-xs sm:text-sm text-[#4b435c]" style={{ backgroundColor: '#e9d5ff' }}>Seasonal</TabsTrigger>
              <TabsTrigger value="financial savvy" data-testid="tab-financial" className="text-xs sm:text-sm text-[#4b435c]" style={{ backgroundColor: '#e9d5ff' }}>Financial</TabsTrigger>
              <TabsTrigger value="organization" data-testid="tab-organization" className="text-xs sm:text-sm text-[#4b435c]" style={{ backgroundColor: '#e9d5ff' }}>Organization</TabsTrigger>
              <TabsTrigger value="referral & community" data-testid="tab-referral" className="text-xs sm:text-sm text-[#4b435c]" style={{ backgroundColor: '#e9d5ff' }}>Referrals</TabsTrigger>
              <TabsTrigger value="milestones" data-testid="tab-milestones" className="text-xs sm:text-sm text-[#4b435c]" style={{ backgroundColor: '#e9d5ff' }}>Milestones</TabsTrigger>
              <TabsTrigger value="streaks" data-testid="tab-streaks" className="text-xs sm:text-sm text-[#4b435c]" style={{ backgroundColor: '#e9d5ff' }}>Streaks</TabsTrigger>
              <TabsTrigger value="special" data-testid="tab-special" className="text-xs sm:text-sm text-[#4b435c]" style={{ backgroundColor: '#e9d5ff' }}>Special</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedCategory}>
              <Card style={{ backgroundColor: '#f2f2f2' }}>
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="text-base sm:text-lg lg:text-xl" style={{ color: '#2c0f5b' }}>
                    {selectedCategory === "all" ? "All Achievements" : 
                     selectedCategory === "seasonal" ? "Seasonal Badges" :
                     selectedCategory === "financial savvy" ? "Financial Savvy Achievements" :
                     selectedCategory === "organization" ? "Organization Badges" :
                     selectedCategory === "referral & community" ? "Referral & Community Badges" :
                     selectedCategory === "milestones" ? "Milestone Achievements" :
                     selectedCategory === "streaks" ? "Streak Achievements" :
                     selectedCategory === "special" ? "Special Achievements" :
                     "All Achievements"}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm" style={{ color: '#6b7280' }}>
                    {selectedCategory === "all" ? "Complete milestones to unlock badges" :
                     selectedCategory === "seasonal" ? "Complete seasonal maintenance tasks" :
                     selectedCategory === "financial savvy" ? "Save money and track your spending" :
                     selectedCategory === "organization" ? "Stay organized with records and documentation" :
                     selectedCategory === "referral & community" ? "Invite friends and grow the community" :
                     selectedCategory === "milestones" ? "Reach important maintenance milestones" :
                     selectedCategory === "streaks" ? "Build consistent maintenance habits" :
                     selectedCategory === "special" ? "Unlock exclusive special achievements" :
                     "Complete milestones to unlock badges"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                                    <span className="text-xs font-semibold" style={{ color: '#6b7280' }}>
                                      {getProgressLabel(achievement)}
                                    </span>
                                    <span className="text-xs font-semibold" style={{ color: '#6d28d9' }}>
                                      {Math.round(progress)}%
                                    </span>
                                  </div>
                                  <Progress 
                                    value={progress} 
                                    className="h-2 mb-2" 
                                    data-testid={`progress-${achievement.key}`}
                                  />
                                  <div className="text-xs" style={{ color: '#6b7280' }}>
                                    {getRemainingText(achievement, progress)}
                                  </div>
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
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-semibold" style={{ color: '#6b7280' }}>
                              {getProgressLabel(selectedAchievement)}
                            </span>
                            <span className="text-sm font-semibold" style={{ color: '#6d28d9' }}>
                              {Math.round(selectedAchievement.progress)}%
                            </span>
                          </div>
                          <Progress value={selectedAchievement.progress} className="h-2 mb-2" />
                          <div className="text-sm font-medium" style={{ color: '#6d28d9' }}>
                            {getRemainingText(selectedAchievement, selectedAchievement.progress)}
                          </div>
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

          {/* Category Modal - Shows all achievements in a category */}
          <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto" style={{ backgroundColor: '#f2f2f2' }}>
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl" style={{ color: '#2c0f5b' }}>
                  {modalCategory === 'all' ? 'All Achievements' :
                   modalCategory === 'Seasonal' ? 'Seasonal Badges' :
                   modalCategory === 'Financial Savvy' ? 'Financial Savvy Achievements' :
                   modalCategory === 'Organization' ? 'Organization Badges' :
                   modalCategory === 'Referral & Community' ? 'Referral & Community Badges' :
                   modalCategory === 'Milestones' ? 'Milestone Achievements' :
                   modalCategory === 'Streaks' ? 'Streak Achievements' :
                   modalCategory === 'Special' ? 'Special Achievements' : 'Achievements'}
                </DialogTitle>
                <DialogDescription style={{ color: '#6b7280' }}>
                  {modalCategory === 'all' ? `${unlockedCount}/${totalCount} achievements unlocked` :
                   modalCategory === 'Seasonal' ? `${categoryStats.seasonal.unlocked}/${categoryStats.seasonal.total} seasonal badges earned` :
                   modalCategory === 'Financial Savvy' ? `${categoryStats.financial.unlocked}/${categoryStats.financial.total} financial achievements unlocked` :
                   modalCategory === 'Organization' ? `${categoryStats.organization.unlocked}/${categoryStats.organization.total} organization badges earned` :
                   modalCategory === 'Referral & Community' ? `${categoryStats.referral.unlocked}/${categoryStats.referral.total} referral badges earned` :
                   modalCategory === 'Milestones' ? `${categoryStats.milestones.unlocked}/${categoryStats.milestones.total} milestones reached` :
                   modalCategory === 'Streaks' ? `${categoryStats.streaks.unlocked}/${categoryStats.streaks.total} streaks achieved` :
                   modalCategory === 'Special' ? `${categoryStats.special.unlocked}/${categoryStats.special.total} special badges earned` : ''}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 gap-4 mt-4">
                {(modalCategory === 'all' ? achievements : achievements.filter(a => a.category === modalCategory)).map((achievement) => {
                  const IconComponent = iconMap[achievement.icon] || Trophy;
                  const isUnlocked = achievement.isUnlocked;
                  const progress = achievement.progress || 0;
                  
                  return (
                    <div
                      key={achievement.key}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isUnlocked
                          ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50'
                          : 'border-gray-300 bg-white opacity-75'
                      }`}
                      data-testid={`modal-achievement-${achievement.key}`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-3 rounded-full shrink-0 ${
                            isUnlocked
                              ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                              : 'bg-gray-300 text-gray-500'
                          }`}
                        >
                          {isUnlocked ? (
                            <IconComponent className="w-6 h-6" />
                          ) : (
                            <Lock className="w-6 h-6" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold mb-1" style={{ color: '#2c0f5b' }}>
                            {achievement.name}
                          </h3>
                          <p className="text-sm mb-2" style={{ color: '#6b7280' }}>
                            {achievement.description}
                          </p>
                          
                          {!isUnlocked && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-semibold" style={{ color: '#6b7280' }}>
                                  {getProgressLabel(achievement)}
                                </span>
                                <span className="text-xs font-semibold" style={{ color: '#6d28d9' }}>
                                  {Math.round(progress)}%
                                </span>
                              </div>
                              <Progress 
                                value={progress} 
                                className="h-2 mb-1" 
                                data-testid={`modal-progress-${achievement.key}`}
                              />
                              <div className="text-xs" style={{ color: '#6b7280' }}>
                                {getRemainingText(achievement, progress)}
                              </div>
                            </div>
                          )}
                          
                          {isUnlocked && (
                            <div className="flex items-center gap-2">
                              <Badge 
                                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white"
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
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}

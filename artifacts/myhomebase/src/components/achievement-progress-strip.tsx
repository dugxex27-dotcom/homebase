import { useQuery } from "@tanstack/react-query";
import { Award, ChevronRight, Trophy } from "lucide-react";
import { Link } from "wouter";
import { fetchJsonWithTimeout } from "@/lib/fetch-json-with-timeout";

export interface AchievementProgressItem {
  key: string;
  name: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  progress: number;
  unlockedAt?: string;
}

interface AchievementsResponse {
  achievements: AchievementProgressItem[];
}

interface AchievementProgressStripProps {
  className?: string;
  heading?: string;
}

const clampProgress = (value: number) => Math.min(100, Math.max(0, value || 0));

export function AchievementProgressStrip({
  className = "",
  heading = "Achievements",
}: AchievementProgressStripProps) {
  const { data, isLoading, isError, refetch } = useQuery<AchievementsResponse>({
    queryKey: ["/api/achievements"],
    queryFn: async () => {
      return fetchJsonWithTimeout<AchievementsResponse>(
        "/api/achievements",
        { credentials: "include" },
      );
    },
    staleTime: 60_000,
  });

  const achievements = data?.achievements ?? [];
  const unlocked = achievements.filter((achievement) => achievement.isUnlocked);
  const recentUnlocked = [...unlocked].sort((a, b) => {
    const aTime = a.unlockedAt ? Date.parse(a.unlockedAt) : 0;
    const bTime = b.unlockedAt ? Date.parse(b.unlockedAt) : 0;
    return bTime - aTime;
  })[0];
  const nextAchievement = achievements
    .filter((achievement) => !achievement.isUnlocked)
    .sort((a, b) => clampProgress(b.progress) - clampProgress(a.progress))[0];

  return (
    <section
      className={`rounded-2xl border border-[#DED8F7] bg-white p-4 shadow-sm ${className}`}
      aria-labelledby="achievement-progress-heading"
      data-testid="achievement-progress-strip"
    >
      <div className="flex min-h-11 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEEDFE] text-[#3C258E]">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="achievement-progress-heading" className="text-sm font-extrabold text-[#2C0F5B]">
            {heading}
          </h2>
          {isLoading ? (
            <p className="mt-0.5 text-xs text-gray-500">Loading your awards…</p>
          ) : isError ? (
            <p className="mt-0.5 text-xs text-gray-500">
              Awards are temporarily unavailable.{" "}
              <button type="button" className="font-bold text-[#3C258E] underline" onClick={() => refetch()}>
                Try again
              </button>
            </p>
          ) : achievements.length === 0 ? (
            <p className="mt-0.5 text-xs text-gray-500">Complete home-care actions to start earning awards.</p>
          ) : (
            <p className="mt-0.5 text-xs font-semibold text-gray-600">
              {unlocked.length} of {achievements.length} unlocked
              {recentUnlocked ? ` · Latest: ${recentUnlocked.name}` : ""}
            </p>
          )}
        </div>
        <Link
          href="/achievements"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-extrabold text-[#3C258E] hover:bg-[#F5F3FF]"
        >
          View all
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {!isLoading && !isError && nextAchievement && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 font-bold text-gray-800">
              <Award className="h-4 w-4 shrink-0 text-[#8A6D1D]" aria-hidden="true" />
              <span className="truncate">Next: {nextAchievement.name}</span>
            </span>
            <span className="shrink-0 font-extrabold text-[#3C258E]">
              {Math.round(clampProgress(nextAchievement.progress))}%
            </span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEEDFE]"
            role="progressbar"
            aria-label={`${nextAchievement.name} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clampProgress(nextAchievement.progress))}
          >
            <div
              className="h-full rounded-full bg-[#6D4AFF] transition-[width]"
              style={{ width: `${clampProgress(nextAchievement.progress)}%` }}
            />
          </div>
          <p className="mt-1.5 line-clamp-1 text-xs text-gray-500">{nextAchievement.description}</p>
        </div>
      )}
    </section>
  );
}
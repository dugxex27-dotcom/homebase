import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isNativePlatform } from "@/lib/nativeBrowser";
import AddressAutocomplete from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Home, Gift, ChevronRight, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingProgressRecord {
  id: string;
  userId: string;
  currentStep: number;
  completedSteps: number[];
  skippedSteps: number[];
  referralCodeApplied: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const TOTAL_ONBOARDING_STEPS = 11;

// ─── Onboarding Flow Component ────────────────────────────────────────────────

interface OnboardingFlowProps {
  initialStep: number;
  onClose: () => void;
}

function OnboardingFlow({ initialStep, onClose }: OnboardingFlowProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<2 | 3 | "done">(initialStep <= 2 ? 2 : 3);

  // Referral step state
  const [referralCode, setReferralCode] = useState("");
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralName, setReferralName] = useState<string | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);

  // Address step state
  const [addressText, setAddressText] = useState("");
  const [addressReady, setAddressReady] = useState(false);
  const [addressLat, setAddressLat] = useState<string | null>(null);
  const [addressLon, setAddressLon] = useState<string | null>(null);

  // ── Progress update ────────────────────────────────────────────────────────
  const progressMutation = useMutation({
    mutationFn: (body: { currentStep: number; completedSteps?: number[]; skippedSteps?: number[] }) =>
      apiRequest("/api/onboarding/progress", "POST", body).then((r) => r.json()),
  });


  // ── Referral apply ────────────────────────────────────────────────────────
  const referralMutation = useMutation({
    mutationFn: (code: string) =>
      apiRequest("/api/onboarding/referral", "POST", { code }).then((r) => r.json()),
    onSuccess: (data) => {
      setReferralApplied(true);
      setReferralName(data.referrerName ?? null);
      setReferralError(null);
    },
    onError: async (err: any) => {
      try {
        const body = typeof err?.json === "function" ? await err.json() : {};
        setReferralError(body?.message ?? "Invalid referral code. Try again.");
      } catch {
        setReferralError("Invalid referral code. Try again.");
      }
    },
  });

  // ── House creation ────────────────────────────────────────────────────────
  const createHouseMutation = useMutation({
    mutationFn: (body: { name: string; address: string; climateZone: string; homeSystems: string[]; latitude?: string; longitude?: string }) =>
      apiRequest("/api/houses", "POST", body).then((r) => r.json()),
  });

  // ── Onboarding complete (skip address) ────────────────────────────────────
  const completeMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/onboarding/complete", "POST", {}).then((r) => r.json()),
  });

  // ── Step handlers ─────────────────────────────────────────────────────────

  const handleSkipReferral = useCallback(async () => {
    await progressMutation.mutateAsync({ currentStep: 3, skippedSteps: [2] });
    setStep(3);
  }, [progressMutation]);

  const handleApplyReferral = useCallback(() => {
    const code = referralCode.trim();
    if (!code) return;
    setReferralError(null);
    referralMutation.mutate(code);
  }, [referralCode, referralMutation]);

  const handleReferralNext = useCallback(async () => {
    await progressMutation.mutateAsync({ currentStep: 3, completedSteps: [2] });
    setStep(3);
  }, [progressMutation]);

  const handleAddressSelect = useCallback((_formatted: string, raw: { lat: string; lon: string; display_name: string }) => {
    setAddressReady(true);
    setAddressLat(raw.lat);
    setAddressLon(raw.lon);
  }, []);

  const handleAddressChange = useCallback((val: string) => {
    setAddressText(val);
    if (!val) {
      setAddressReady(false);
      setAddressLat(null);
      setAddressLon(null);
    }
  }, []);

  const handleAddressSubmit = useCallback(async () => {
    if (!addressReady || !addressText) return;

    const streetPart = addressText.split(",")[0]?.trim() || "My Home";

    await createHouseMutation.mutateAsync({
      name: streetPart,
      address: addressText,
      climateZone: "4A",
      homeSystems: [],
      ...(addressLat ? { latitude: addressLat } : {}),
      ...(addressLon ? { longitude: addressLon } : {}),
    });

    await progressMutation.mutateAsync({ currentStep: 4, completedSteps: [2, 3] });
    setStep("done");

    // Auto-close so GuidedTour welcome modal appears
    setTimeout(onClose, 1400);
  }, [addressReady, addressText, addressLat, addressLon, createHouseMutation, progressMutation, onClose]);

  // Skip address — stamps completedAt so the overlay never re-appears
  const handleSkipAddress = useCallback(async () => {
    await completeMutation.mutateAsync();
    onClose();
  }, [completeMutation, onClose]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (step === "done") {
    return createPortal(
      <div
        className="fixed inset-0 z-[10100] flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(160deg, #1e0a3c 0%, #3b0f7a 60%, #6d28d9 100%)" }}
      >
        <div className="flex flex-col items-center gap-4 px-8 text-center animate-in fade-in zoom-in-90 duration-500">
          <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-white text-2xl font-bold mt-2">Home added!</h2>
          <p className="text-purple-200 text-base leading-relaxed">
            Your home is set up. Let's take a quick tour of the app.
          </p>
        </div>
      </div>,
      document.body
    );
  }

  const isStep2 = step === 2;
  const isBusy =
    progressMutation.isPending ||
    referralMutation.isPending ||
    createHouseMutation.isPending;

  return createPortal(
    <div
      className="fixed inset-0 z-[10100] flex flex-col"
      style={{
        background: "linear-gradient(160deg, #1e0a3c 0%, #3b0f7a 60%, #6d28d9 100%)",
        paddingTop: "env(safe-area-inset-top, 16px)",
        paddingBottom: "env(safe-area-inset-bottom, 24px)",
      }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex gap-1.5">
          {[2, 3].map((s) => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: step === s ? 28 : 10,
                background: step === s ? "#10b981" : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
        <span className="text-purple-300 text-xs">
          Step {isStep2 ? 2 : 3} of {TOTAL_ONBOARDING_STEPS}
        </span>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col justify-center px-6 gap-6">
        {isStep2 ? (
          /* ──── Step 2: Referral ──── */
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500 bg-opacity-30 flex items-center justify-center">
                <Gift className="w-8 h-8 text-purple-200" />
              </div>
              <h1 className="text-white text-2xl font-bold leading-tight">
                Got a referral code?
              </h1>
              <p className="text-purple-200 text-sm leading-relaxed max-w-xs">
                If a friend or contractor invited you, enter their code and you'll both get credit.
              </p>
            </div>

            {referralApplied ? (
              <div className="rounded-2xl bg-emerald-500 bg-opacity-20 border border-emerald-500 border-opacity-40 px-4 py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-emerald-300 text-sm font-semibold">Code applied!</p>
                  {referralName && (
                    <p className="text-emerald-400 text-xs mt-0.5">Referred by {referralName}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <Input
                    value={referralCode}
                    onChange={(e) => {
                      setReferralCode(e.target.value.toUpperCase());
                      setReferralError(null);
                    }}
                    placeholder="Enter code (e.g. ABC123)"
                    className="flex-1 bg-white bg-opacity-10 border-white border-opacity-20 text-white placeholder:text-purple-300 text-base h-12 rounded-xl"
                    maxLength={20}
                    autoCapitalize="characters"
                    disabled={isBusy}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyReferral()}
                  />
                  <Button
                    onClick={handleApplyReferral}
                    disabled={!referralCode.trim() || isBusy}
                    className="h-12 px-4 rounded-xl font-semibold"
                    style={{ background: "#10b981", color: "white" }}
                  >
                    Apply
                  </Button>
                </div>
                {referralError && (
                  <p className="text-red-300 text-xs px-1">{referralError}</p>
                )}
              </div>
            )}
          </>
        ) : (
          /* ──── Step 3: Address ──── */
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500 bg-opacity-30 flex items-center justify-center">
                <Home className="w-8 h-8 text-purple-200" />
              </div>
              <h1 className="text-white text-2xl font-bold leading-tight">
                Add your first home
              </h1>
              <p className="text-purple-200 text-sm leading-relaxed max-w-xs">
                We'll build a personalised maintenance schedule and track your home's health score.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <AddressAutocomplete
                value={addressText}
                onChange={handleAddressChange}
                onSelect={(formatted, raw) => handleAddressSelect(formatted, raw as any)}
                placeholder="Start typing your address…"
                className="bg-white bg-opacity-10 border-white border-opacity-20 text-white placeholder:text-purple-300 h-12 rounded-xl text-base"
              />
              <p className="text-purple-400 text-xs px-1">
                Your address is never shared without your permission.
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Bottom buttons ── */}
      <div className="px-6 flex flex-col gap-3 pb-2">
        {isStep2 ? (
          <>
            <Button
              onClick={referralApplied ? handleReferralNext : handleReferralNext}
              disabled={isBusy}
              className="w-full h-14 rounded-2xl text-base font-bold"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }}
            >
              {referralApplied ? "Continue" : "Continue"}
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
            {!referralApplied && (
              <button
                onClick={handleSkipReferral}
                disabled={isBusy}
                className="text-purple-300 text-sm text-center py-2 hover:text-white transition-colors"
              >
                Skip, I don't have a code
              </button>
            )}
          </>
        ) : (
          <>
          <Button
            onClick={handleAddressSubmit}
            disabled={!addressReady || isBusy}
            className="w-full h-14 rounded-2xl text-base font-bold"
            style={{
              background: addressReady
                ? "linear-gradient(135deg, #10b981, #059669)"
                : "rgba(255,255,255,0.15)",
              color: "white",
            }}
          >
            {isBusy
              ? "Setting up your home…"
              : "Add My Home"}
            {!isBusy && (
              <ChevronRight className="w-5 h-5 ml-1" />
            )}
          </Button>
          <button
            onClick={handleSkipAddress}
            disabled={isBusy}
            className="text-purple-300 text-sm text-center py-2 hover:text-white transition-colors"
          >
            I'll add my home later
          </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Controller (mounted in App.tsx) ─────────────────────────────────────────
// Conditionally shows the OnboardingFlow for native homeowners who haven't
// completed the data-entry phase (steps 2 & 3).

export function OnboardingFlowController() {
  const { user } = useAuth();
  const typedUser = user as { role?: string; id?: string } | undefined;
  const queryClient = useQueryClient();

  const isEligible =
    !!typedUser &&
    typedUser.role === "homeowner" &&
    !typedUser.id?.startsWith("demo-") &&
    isNativePlatform;

  const { data: progress } = useQuery<OnboardingProgressRecord>({
    queryKey: ["/api/onboarding/progress"],
    enabled: isEligible,
    staleTime: 30_000,
  });

  const handleClose = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
  }, [queryClient]);

  if (!isEligible) return null;
  if (!progress) return null;
  if (progress.completedAt) return null;
  if (progress.currentStep >= 4) return null;

  return <OnboardingFlow initialStep={progress.currentStep} onClose={handleClose} />;
}

// ─── Replay hook (used by Settings page) ─────────────────────────────────────
// Clears the GuidedTour localStorage so the welcome modal re-appears.
// Does NOT reset onboarding_progress (data entry is already done).

const HOMEOWNER_TOUR_KEY = "mhb_guided_tour";

export function useReplayWalkthrough() {
  return useCallback(() => {
    localStorage.removeItem(HOMEOWNER_TOUR_KEY);
    // Force a page reload so the GuidedTour re-initialises cleanly
    window.location.reload();
  }, []);
}

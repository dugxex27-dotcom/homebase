import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import { Gift, Copy, Share2, MessageSquare, Download, ImageIcon, Star, Users, CalendarCheck } from "lucide-react";
import { PaidSubscriberGate } from "@/components/homeowner-feature-gate";
import { useHomeownerSubscription } from "@/hooks/useHomeownerSubscription";

import instagramPostImg from '@assets/homebase-homeowner-homeowner-ig-post_1768410840843.png';
import instagramStoryImg from '@assets/homebase-homeowner-homeowner-ig-story_1768411215294.png';
import facebookTwitterImg from '@assets/homebase-homeowner-referral_(3)_1768267382477.png';
import { PageHero } from "@/components/page-hero";

export default function HomeownerReferral() {
  const { toast } = useToast();
  const { user } = useAuth();
  const typedUser = user as UserType | undefined;
  const { isPaidSubscriber } = useHomeownerSubscription();

  const { data: referralData, isLoading: isLoadingReferral } = useQuery({
    queryKey: ['/api/user/referral-code'],
    enabled: !!typedUser && isPaidSubscriber,
  });

  const rd = referralData as any;
  const referralCode = rd?.referralCode || '';
  const referralLink = rd?.referralLink || '';
  const creditBalance = rd?.creditBalance ?? 0;
  const creditsNeeded = rd?.creditsNeeded ?? 5;
  const freeMonthsPending = rd?.freeMonthsPending ?? 0;
  const freeMonthsTotal = rd?.freeMonthsTotal ?? 0;
  const activeReferrals = rd?.activeReferrals ?? 0;

  const progressPercent = creditsNeeded > 0 ? Math.min((creditBalance / creditsNeeded) * 100, 100) : 0;

  const shareMessage = `Join me on MyHomeBase™ — the best app for homeowners! Use my referral code ${referralCode} when you sign up. Every month you stay subscribed, I earn 1 credit toward a free month — and you get the full MyHomeBase™ experience! Sign up here: ${referralLink}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Copied to clipboard" });
  };

  const shareViaText = () => window.open(`sms:?body=${encodeURIComponent(shareMessage)}`);
  const shareViaWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`);
  const shareViaFacebook = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(shareMessage)}`);
  const shareViaTwitter = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`);

  const downloadImageWithCode = async (imageSrc: string, filename: string, codePosition: { x: number; y: number; fontSize?: number; color?: string }) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        if (ctx) {
          const fontSize = codePosition.fontSize || 48;
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = codePosition.color || '#2c0f5b';
          ctx.textAlign = 'center';
          ctx.fillText(referralCode, codePosition.x, codePosition.y);
        }
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Downloaded!", description: `${filename} has been downloaded with your referral code.` });
          }
        });
      };
      img.src = imageSrc;
    } catch {
      toast({ title: "Error", description: "Failed to download image. Please try again.", variant: "destructive" });
    }
  };

  if (!typedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--page-background)' }}>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="Homeowner"
        title="Referral Program"
        subtitle="Share MyHomeBase™ and earn free months"
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <PaidSubscriberGate featureName="Referral Rewards">
          <div className="space-y-8">

            {/* How It Works */}
            <Card className="shadow-lg border-purple-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Star className="w-5 h-5" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <Share2 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900 text-sm">1. Share Your Code</p>
                    <p className="text-xs text-gray-600 mt-1">Invite friends and family to join MyHomeBase™</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900 text-sm">2. Earn 1 Credit/Month</p>
                    <p className="text-xs text-gray-600 mt-1">For every active paying referral, you earn 1 credit each month they stay subscribed</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <CalendarCheck className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900 text-sm">3. Get a Free Month</p>
                    <p className="text-xs text-gray-600 mt-1">Once you accumulate enough credits (equal to your monthly cost), you earn a free month!</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credit Progress */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Gift className="w-5 h-5" />
                  Your Referral Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {isLoadingReferral ? (
                  <div className="h-20 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
                ) : (
                  <>
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-purple-700">{activeReferrals}</div>
                        <div className="text-xs text-gray-600 mt-1">Active Referrals</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-purple-700">{creditBalance}</div>
                        <div className="text-xs text-gray-600 mt-1">Credits Earned</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-purple-700">{freeMonthsTotal}</div>
                        <div className="text-xs text-gray-600 mt-1">Free Months Earned</div>
                      </div>
                    </div>

                    {/* Progress bar toward next free month */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress to next free month</span>
                        <span className="text-sm font-bold text-purple-700">{creditBalance} / {creditsNeeded} credits</span>
                      </div>
                      <Progress value={progressPercent} className="h-3" />
                      <p className="text-xs text-gray-500 mt-2">
                        {creditBalance >= creditsNeeded
                          ? "You've earned a free month!"
                          : `${creditsNeeded - creditBalance} more credit${creditsNeeded - creditBalance === 1 ? '' : 's'} needed for your next free month`}
                      </p>
                    </div>

                    {/* Pending free months notice */}
                    {freeMonthsPending > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                        <CalendarCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-green-800">
                            {freeMonthsPending} free month{freeMonthsPending > 1 ? 's' : ''} pending
                          </p>
                          <p className="text-xs text-green-700 mt-0.5">
                            Our team will apply your free month{freeMonthsPending > 1 ? 's' : ''} to your account shortly.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Referral Code & Sharing */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Share2 className="w-5 h-5" />
                  Share Your Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  Share MyHomeBase™ with friends and family. You earn 1 credit every month each person stays subscribed — and free months stack up fast!
                </div>

                {/* Referral Code */}
                <div>
                  <Label className="text-purple-600">Your Referral Code</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={referralCode}
                      readOnly
                      data-testid="input-homeowner-referral-code"
                      className="font-mono text-lg font-bold text-center border-purple-200 focus:border-purple-500"
                      style={{ color: '#7c3aed' }}
                    />
                    <Button
                      onClick={() => copyToClipboard(referralCode)}
                      variant="outline"
                      size="icon"
                      data-testid="button-copy-homeowner-code"
                      title="Copy referral code"
                      type="button"
                      className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Share Options */}
                <div>
                  <Label className="text-purple-600">Share with Your Network</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 p-3 rounded-lg bg-purple-600">
                    <Button
                      onClick={shareViaText}
                      variant="outline"
                      size="sm"
                      data-testid="button-homeowner-share-text"
                      className="flex items-center gap-2 bg-white hover:bg-gray-50"
                      type="button"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Text Message
                    </Button>
                    <Button
                      onClick={shareViaWhatsApp}
                      variant="outline"
                      size="sm"
                      data-testid="button-homeowner-share-whatsapp"
                      className="flex items-center gap-2 bg-white hover:bg-gray-50"
                      style={{ color: '#25D366' }}
                      type="button"
                    >
                      <Share2 className="w-4 h-4" />
                      WhatsApp
                    </Button>
                    <Button
                      onClick={shareViaFacebook}
                      variant="outline"
                      size="sm"
                      data-testid="button-homeowner-share-facebook"
                      className="flex items-center gap-2 bg-white hover:bg-gray-50"
                      style={{ color: '#1877F2' }}
                      type="button"
                    >
                      <Share2 className="w-4 h-4" />
                      Facebook
                    </Button>
                    <Button
                      onClick={shareViaTwitter}
                      variant="outline"
                      size="sm"
                      data-testid="button-homeowner-share-twitter"
                      className="flex items-center gap-2 bg-white hover:bg-gray-50"
                      style={{ color: '#1DA1F2' }}
                      type="button"
                    >
                      <Share2 className="w-4 h-4" />
                      Twitter
                    </Button>
                  </div>
                </div>

                {/* Copy Link */}
                <div>
                  <Label className="text-purple-600">Referral Link</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={referralLink}
                      readOnly
                      data-testid="input-homeowner-referral-link"
                      className="text-sm border-purple-200 focus:border-purple-500"
                      style={{ color: '#7c3aed' }}
                    />
                    <Button
                      onClick={() => copyToClipboard(referralLink)}
                      variant="outline"
                      size="icon"
                      data-testid="button-copy-homeowner-link"
                      title="Copy referral link"
                      type="button"
                      className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Share with friends, family, and neighbors. They get the full MyHomeBase™ experience while you earn free months!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Shareable Graphics */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <ImageIcon className="w-5 h-5" />
                  Shareable Graphics
                </CardTitle>
                <CardDescription>
                  Download personalized graphics with your referral code to share on social media
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Click download on any graphic below to get a personalized version with your referral code <span className="font-mono font-bold text-purple-600">{referralCode}</span> already included!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
                    <div className="aspect-square rounded overflow-hidden border-2 border-gray-200">
                      <img src={instagramPostImg} alt="Instagram Post Template" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-purple-600">Instagram Post</h4>
                      <p className="text-xs text-gray-600">Square format - 1080x1080px</p>
                      <Button
                        onClick={() => downloadImageWithCode(instagramPostImg, `homebase-homeowner-instagram-${referralCode}.png`, { x: 534, y: 782, fontSize: 39, color: '#2c0f5b' })}
                        size="sm"
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        data-testid="button-download-homeowner-instagram-post"
                        type="button"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
                    <div className="aspect-[9/16] rounded overflow-hidden border-2 border-gray-200 max-h-64">
                      <img src={instagramStoryImg} alt="Instagram Story Template" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-purple-600">Instagram Story</h4>
                      <p className="text-xs text-gray-600">Vertical format - 1080x1920px</p>
                      <Button
                        onClick={() => downloadImageWithCode(instagramStoryImg, `homebase-homeowner-story-${referralCode}.png`, { x: 300, y: 734, color: '#2c0f5b' })}
                        size="sm"
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        data-testid="button-download-homeowner-instagram-story"
                        type="button"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
                    <div className="aspect-[16/9] rounded overflow-hidden border-2 border-gray-200">
                      <img src={facebookTwitterImg} alt="Facebook/Twitter Template" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-purple-600">Facebook/Twitter</h4>
                      <p className="text-xs text-gray-600">Horizontal - 1200x630px</p>
                      <Button
                        onClick={() => downloadImageWithCode(facebookTwitterImg, `homebase-homeowner-facebook-${referralCode}.png`, { x: 792, y: 748, fontSize: 43 })}
                        size="sm"
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        data-testid="button-download-homeowner-facebook-twitter"
                        type="button"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-purple-800">
                    <strong>Tip:</strong> Download these graphics and share them on your social media. When friends or family sign up using your code, you'll earn 1 credit per month for every month they stay subscribed!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </PaidSubscriberGate>
      </main>
    </div>
  );
}

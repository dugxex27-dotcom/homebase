import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import { Gift, Copy, Share2, MessageSquare, Download, ImageIcon, Crown, TrendingUp } from "lucide-react";

import instagramPostImg from '@assets/generated_images/Contractor_Instagram_referral_post_7b9f6d5d.png';
import instagramStoryImg from '@assets/homebase-contractor-story-AAAKHHCU_(4)_1766265628890.png';
import facebookTwitterImg from '@assets/Contractor_Facebook_Twitter_share_7e5cc06a_(2)_1766263330884.png';

export default function ContractorReferral() {
  const { toast } = useToast();
  const { user } = useAuth();
  const typedUser = user as UserType | undefined;

  // Referral data query
  const { data: referralData, isLoading: isLoadingReferral } = useQuery({
    queryKey: ['/api/user/referral-code'],
    enabled: !!typedUser,
  });

  const referralCode = (referralData as any)?.referralCode || '';
  const referralLink = (referralData as any)?.referralLink || '';
  const referralCount = (referralData as any)?.referralCount || 0;
  const earnedCredits = (referralData as any)?.earnedCredits || 0;
  const referralCreditCap = (referralData as any)?.referralCreditCap || 20;
  const currentCredits = (referralData as any)?.currentCredits || 0;
  const tierName = (referralData as any)?.tierName || 'contractor';
  const isPro = tierName === 'contractor_pro';
  const creditProgress = (earnedCredits / referralCreditCap) * 100;
  
  const shareMessage = `Join me on HomeBase! Use my referral code ${referralCode} and I get $1 off when you subscribe. You'll get the full HomeBase experience at regular price while helping me save money! Perfect for contractors! Sign up here: ${referralLink}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Copied to clipboard",
    });
  };

  const shareViaText = () => {
    window.open(`sms:?body=${encodeURIComponent(shareMessage)}`);
  };

  const shareViaWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`);
  };

  const shareViaFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(shareMessage)}`);
  };

  const shareViaTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`);
  };

  const downloadImageWithCode = async (imageSrc: string, filename: string, codePosition: { x: number, y: number }, textColor: string = '#1560a2', fontSize: number = 48, textAlign: CanvasTextAlign = 'center') => {
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
          ctx.font = `600 ${fontSize}px "Segoe UI", "Helvetica Neue", Helvetica, sans-serif`;
          ctx.fillStyle = textColor;
          ctx.textAlign = textAlign;
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
            
            toast({
              title: "Downloaded!",
              description: `${filename} has been downloaded with your referral code.`,
            });
          }
        });
      };
      
      img.src = imageSrc;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download image. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!typedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1560a2' }}>
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Referral Program</h1>
          <p className="text-gray-600 mt-1">Share HomeBase and earn rewards</p>
        </div>

        <div className="space-y-6">
          {/* Referral Stats Card */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Your Referral Stats
                {isPro && (
                  <Badge className="ml-2 bg-blue-600 text-white">
                    <Crown className="w-3 h-3 mr-1" />
                    Pro
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600">{referralCount}</div>
                  <div className="text-sm text-gray-600">Active Referrals</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600">${earnedCredits}</div>
                  <div className="text-sm text-gray-600">Credits Earned</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">${currentCredits}</div>
                  <div className="text-sm text-gray-600">Applied Savings</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600">${referralCreditCap}</div>
                  <div className="text-sm text-gray-600">Monthly Cap</div>
                </div>
              </div>
              
              {/* Progress to Cap */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Progress to Cap</span>
                  <span className="text-sm text-gray-600">${earnedCredits} earned / ${referralCreditCap} cap</span>
                </div>
                <Progress value={Math.min(creditProgress, 100)} className="h-3" />
                {earnedCredits >= referralCreditCap && (
                  <p className="text-sm text-green-600 mt-2">
                    You've reached your monthly referral cap! You're saving ${currentCredits}/month.
                    {earnedCredits > referralCreditCap && ` (${earnedCredits - referralCreditCap} credits above cap)`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Referral Rewards Card */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Gift className="w-5 h-5 text-blue-600" />
                Referral Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                Share HomeBase with other contractors and homeowners. Earn $1 off your subscription for each paid subscriber (up to ${referralCreditCap}/month)!
              </div>
              
              {/* Referral Code */}
              <div>
                <Label className="text-gray-700">Your Referral Code</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={referralCode}
                    readOnly
                    data-testid="input-contractor-referral-code"
                    className="font-mono text-lg font-bold text-center bg-gray-50 text-blue-600"
                  />
                  <Button
                    onClick={() => copyToClipboard(referralCode)}
                    size="icon"
                    data-testid="button-copy-contractor-code"
                    title="Copy referral code"
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Share Options */}
              <div>
                <Label className="text-gray-700">Share with Your Network</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 p-3 rounded-lg bg-gray-50">
                  <Button
                    onClick={shareViaText}
                    variant="outline"
                    size="sm"
                    data-testid="button-contractor-share-text"
                    className="flex items-center gap-2 bg-white"
                    type="button"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Text Message
                  </Button>
                  <Button
                    onClick={shareViaWhatsApp}
                    variant="outline"
                    size="sm"
                    data-testid="button-contractor-share-whatsapp"
                    className="flex items-center gap-2 bg-white text-[#25D366]"
                    type="button"
                  >
                    <Share2 className="w-4 h-4" />
                    WhatsApp
                  </Button>
                  <Button
                    onClick={shareViaFacebook}
                    variant="outline"
                    size="sm"
                    data-testid="button-contractor-share-facebook"
                    className="flex items-center gap-2 bg-white text-[#1877F2]"
                    type="button"
                  >
                    <Share2 className="w-4 h-4" />
                    Facebook
                  </Button>
                  <Button
                    onClick={shareViaTwitter}
                    variant="outline"
                    size="sm"
                    data-testid="button-contractor-share-twitter"
                    className="flex items-center gap-2 bg-white text-[#1DA1F2]"
                    type="button"
                  >
                    <Share2 className="w-4 h-4" />
                    Twitter
                  </Button>
                </div>
              </div>

              {/* Copy Link */}
              <div>
                <Label className="text-gray-700">Referral Link</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={referralLink}
                    readOnly
                    data-testid="input-contractor-referral-link"
                    className="text-sm bg-gray-50 text-blue-600"
                  />
                  <Button
                    onClick={() => copyToClipboard(referralLink)}
                    size="icon"
                    data-testid="button-copy-contractor-link"
                    title="Copy referral link"
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Share with fellow contractors and potential clients. They get the full HomeBase experience while helping you save $1!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Shareable Graphics */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                Shareable Graphics
              </CardTitle>
              <CardDescription>
                Download personalized graphics with your referral code to share on social media
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Click download on any graphic below to get a personalized version with your referral code <span className="font-mono font-bold text-blue-600">{referralCode}</span> already included!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Instagram Post */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="aspect-square rounded overflow-hidden border border-gray-200">
                    <img src={instagramPostImg} alt="Instagram Post Template" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-gray-900">Instagram Post</h4>
                    <p className="text-xs text-gray-500">Square format - 1080x1080px</p>
                    <Button
                      onClick={() => downloadImageWithCode(instagramPostImg, `homebase-contractor-instagram-${referralCode}.png`, { x: 540, y: 950 })}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="button-download-contractor-instagram-post"
                      type="button"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Instagram Story */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="aspect-[9/16] rounded overflow-hidden border border-gray-200 max-h-64">
                    <img src={instagramStoryImg} alt="Instagram Story Template" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-gray-900">Instagram Story</h4>
                    <p className="text-xs text-gray-500">Vertical format - 1080x1920px</p>
                    <Button
                      onClick={() => downloadImageWithCode(instagramStoryImg, `homebase-contractor-story-${referralCode}.png`, { x: 752, y: 1728 }, '#ffffff', 48, 'center')}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="button-download-contractor-instagram-story"
                      type="button"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Facebook/Twitter */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="aspect-[16/9] rounded overflow-hidden border border-gray-200">
                    <img src={facebookTwitterImg} alt="Facebook/Twitter Template" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-gray-900">Facebook/Twitter</h4>
                    <p className="text-xs text-gray-500">Horizontal - 1200x630px</p>
                    <Button
                      onClick={() => downloadImageWithCode(facebookTwitterImg, `homebase-contractor-facebook-${referralCode}.png`, { x: 712, y: 510 }, '#ffffff', 32, 'left')}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="button-download-contractor-facebook-twitter"
                      type="button"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-4">
                <p className="text-sm text-blue-700">
                  <strong>Tip:</strong> Download these graphics and share them on your social media. When other contractors or homeowners sign up using your code, you'll earn $1 off your subscription for each referral!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

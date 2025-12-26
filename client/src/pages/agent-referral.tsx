import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import { Gift, Copy, Share2, MessageSquare, Download, ImageIcon } from "lucide-react";

import instagramPostImg from '@assets/generated_images/Agent_Instagram_referral_post_867b9fb1.png';
import instagramStoryImg from '@assets/generated_images/Agent_Instagram_story_graphic_6ea21cfb.png';
import facebookTwitterImg from '@assets/generated_images/Agent_Facebook_Twitter_share_07c75040.png';
import homeownerFacebookTwitterImg from '@assets/homebase-rea-referrals-2_(1)_1766761107420.png';
import homeownerInstagramStoryImg from '@assets/ChatGPT_Image_Dec_26,_2025,_10_05_24_AM_1766761550802.png';

export default function AgentReferral() {
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
  
  // Calculate potential earnings: $15 per referral after 4 months
  const estimatedEarnings = referralCount * 15;
  
  const shareMessage = `Join me on HomeBase! Use my referral code ${referralCode} when you sign up. As a real estate agent, I earn commissions when my clients subscribe. Sign up here: ${referralLink}`;

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

  const downloadImageWithCode = async (imageSrc: string, filename: string, codePosition: { x: number, y: number }) => {
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
          ctx.font = 'bold 48px Arial';
          ctx.fillStyle = '#059669';
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 to-emerald-500">
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-500">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-2 text-green-600">Referral Program</h1>
          <p className="text-lg text-gray-700">Share HomeBase and earn commissions</p>
        </div>

        <div className="space-y-8">
          {/* Referral Rewards Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Gift className="w-5 h-5" />
                Agent Referral Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">Share HomeBase with your clients and earn $15 commission per referral after 4 months of active subscription</div>
              
              {/* Referral Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-700">
                    {referralCount}
                  </div>
                  <div className="text-sm text-green-600 mt-1">Clients Referred</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-700">
                    ${estimatedEarnings}
                  </div>
                  <div className="text-sm text-green-600 mt-1">Potential Earnings</div>
                </div>
              </div>
              
              {/* Referral Code */}
              <div>
                <Label className="text-green-600">Your Referral Code</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={referralCode}
                    readOnly
                    data-testid="input-agent-referral-code"
                    className="font-mono text-lg font-bold text-center border-green-200 focus:border-green-500"
                    style={{ color: '#059669' }}
                  />
                  <Button
                    onClick={() => copyToClipboard(referralCode)}
                    variant="outline"
                    size="icon"
                    data-testid="button-copy-agent-code"
                    title="Copy referral code"
                    type="button"
                    className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Share Options */}
              <div>
                <Label className="text-green-600">Share with Your Clients</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 p-3 rounded-lg bg-green-600">
                  <Button
                    onClick={shareViaText}
                    variant="outline"
                    size="sm"
                    data-testid="button-agent-share-text"
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
                    data-testid="button-agent-share-whatsapp"
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
                    data-testid="button-agent-share-facebook"
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
                    data-testid="button-agent-share-twitter"
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
                <Label className="text-green-600">Referral Link</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={referralLink}
                    readOnly
                    data-testid="input-agent-referral-link"
                    className="text-sm border-green-200 focus:border-green-500"
                    style={{ color: '#059669' }}
                  />
                  <Button
                    onClick={() => copyToClipboard(referralLink)}
                    variant="outline"
                    size="icon"
                    data-testid="button-copy-agent-link"
                    title="Copy referral link"
                    type="button"
                    className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Share with your clients. They get the full HomeBase experience while you earn commissions!
                </p>
              </div>

              {/* Info Text */}
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>💰 Commission Details:</strong> You'll earn a <strong>$15 commission</strong> for each referred client after they maintain an active subscription for 4 consecutive months. Track your referrals and earnings on your Agent Dashboard.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Shareable Graphics for Homeowners */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <ImageIcon className="w-5 h-5" />
                Share with Homeowners
              </CardTitle>
              <CardDescription>
                Graphics designed to share with your homeowner clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Download personalized graphics with your referral code <span className="font-mono font-bold text-green-600">{referralCode}</span> to share with your homeowner clients!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Instagram Post */}
                <div className="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
                  <div className="aspect-square rounded overflow-hidden border-2 border-gray-200">
                    <img src={instagramPostImg} alt="Instagram Post Template for Homeowners" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-green-600">Instagram Post</h4>
                    <p className="text-xs text-gray-600">Square format - 1080x1080px</p>
                    <Button
                      onClick={() => downloadImageWithCode(instagramPostImg, `homebase-homeowner-instagram-${referralCode}.png`, { x: 540, y: 950 })}
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid="button-download-homeowner-instagram-post"
                      type="button"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Instagram Story */}
                <div className="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
                  <div className="aspect-[9/16] rounded overflow-hidden border-2 border-gray-200 max-h-64">
                    <img src={homeownerInstagramStoryImg} alt="Instagram Story Template for Homeowners" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-green-600">Instagram Story</h4>
                    <p className="text-xs text-gray-600">Vertical format - 1080x1920px</p>
                    <Button
                      onClick={() => downloadImageWithCode(homeownerInstagramStoryImg, `homebase-homeowner-story-${referralCode}.png`, { x: 540, y: 700 })}
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid="button-download-homeowner-instagram-story"
                      type="button"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Facebook/Twitter */}
                <div className="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
                  <div className="aspect-[16/9] rounded overflow-hidden border-2 border-gray-200">
                    <img src={homeownerFacebookTwitterImg} alt="Facebook/Twitter Template for Homeowners" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-green-600">Facebook/Twitter</h4>
                    <p className="text-xs text-gray-600">Horizontal - 1200x630px</p>
                    <Button
                      onClick={() => downloadImageWithCode(homeownerFacebookTwitterImg, `homebase-homeowner-facebook-${referralCode}.png`, { x: 840, y: 724 })}
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid="button-download-homeowner-facebook-twitter"
                      type="button"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-green-800">
                  <strong>Tip:</strong> Share these graphics with your homeowner clients. When they sign up using your code, you'll earn $15 commission after 4 months!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Shareable Graphics for Real Estate Agents */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <ImageIcon className="w-5 h-5" />
                Share with Real Estate Agents
              </CardTitle>
              <CardDescription>
                Graphics designed to share with other real estate agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Download personalized graphics with your referral code <span className="font-mono font-bold text-green-600">{referralCode}</span> to share with other agents!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Instagram Post */}
                <div className="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
                  <div className="aspect-square rounded overflow-hidden border-2 border-gray-200">
                    <img src={instagramPostImg} alt="Instagram Post Template for Agents" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-green-600">Instagram Post</h4>
                    <p className="text-xs text-gray-600">Square format - 1080x1080px</p>
                    <Button
                      onClick={() => downloadImageWithCode(instagramPostImg, `homebase-agent-instagram-${referralCode}.png`, { x: 540, y: 950 })}
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid="button-download-agent-instagram-post"
                      type="button"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Instagram Story */}
                <div className="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
                  <div className="aspect-[9/16] rounded overflow-hidden border-2 border-gray-200 max-h-64">
                    <img src={instagramStoryImg} alt="Instagram Story Template for Agents" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-green-600">Instagram Story</h4>
                    <p className="text-xs text-gray-600">Vertical format - 1080x1920px</p>
                    <Button
                      onClick={() => downloadImageWithCode(instagramStoryImg, `homebase-agent-story-${referralCode}.png`, { x: 540, y: 1750 })}
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid="button-download-agent-instagram-story"
                      type="button"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Facebook/Twitter */}
                <div className="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
                  <div className="aspect-[16/9] rounded overflow-hidden border-2 border-gray-200">
                    <img src={facebookTwitterImg} alt="Facebook/Twitter Template for Agents" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-green-600">Facebook/Twitter</h4>
                    <p className="text-xs text-gray-600">Horizontal - 1200x630px</p>
                    <Button
                      onClick={() => downloadImageWithCode(facebookTwitterImg, `homebase-agent-facebook-${referralCode}.png`, { x: 600, y: 580 })}
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid="button-download-agent-facebook-twitter"
                      type="button"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-green-800">
                  <strong>Tip:</strong> Share these graphics with fellow real estate agents. When they sign up using your code, you'll earn $15 commission after 4 months!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import { Gift, Copy, Share2, MessageSquare, Download, ImageIcon } from "lucide-react";

import instagramPostImg from '@assets/generated_images/Contractor_Instagram_referral_post_7b9f6d5d.png';
import instagramStoryImg from '@assets/generated_images/Contractor_Instagram_story_graphic_4d65a731.png';
import facebookTwitterImg from '@assets/generated_images/Contractor_Facebook_Twitter_share_7e5cc06a.png';

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
  
  const shareMessage = `Join me on Home Base! Use my referral code ${referralCode} and I get $1 off when you subscribe. You'll get the full Home Base experience at regular price while helping me save money! Perfect for contractors! Sign up here: ${referralLink}`;

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
          ctx.fillStyle = '#1560a2';
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1560a2' }}>
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#1560a2' }}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 p-6 rounded-lg" style={{ background: '#f2f2f2' }}>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#1560a2' }}>Referral Program</h1>
          <p className="text-lg" style={{ color: '#000000' }}>Share Home Base and earn rewards</p>
        </div>

        <div className="space-y-8">
          {/* Referral Rewards Card */}
          <Card style={{ backgroundColor: '#f2f2f2' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: '#1560a2' }}>
                <Gift className="w-5 h-5" style={{ color: '#1560a2' }} />
                Referral Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                Share Home Base with other contractors and homeowners. I earn $1 off my subscription for each signup!
              </div>
              
              {/* Referral Code */}
              <div>
                <Label style={{ color: '#1560a2' }}>Your Referral Code</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={referralCode}
                    readOnly
                    data-testid="input-contractor-referral-code"
                    className="font-mono text-lg font-bold text-center"
                    style={{ backgroundColor: 'white', color: '#1560a2' }}
                  />
                  <Button
                    onClick={() => copyToClipboard(referralCode)}
                    variant="outline"
                    size="icon"
                    data-testid="button-copy-contractor-code"
                    title="Copy referral code"
                    type="button"
                    style={{ backgroundColor: '#1560a2', color: 'white', borderColor: '#1560a2' }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Share Options */}
              <div>
                <Label style={{ color: '#1560a2' }}>Share with Your Network</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 p-3 rounded-lg" style={{ backgroundColor: '#1560a2' }}>
                  <Button
                    onClick={shareViaText}
                    variant="outline"
                    size="sm"
                    data-testid="button-contractor-share-text"
                    className="flex items-center gap-2"
                    type="button"
                    style={{ backgroundColor: 'white', borderColor: 'white' }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Text Message
                  </Button>
                  <Button
                    onClick={shareViaWhatsApp}
                    variant="outline"
                    size="sm"
                    data-testid="button-contractor-share-whatsapp"
                    className="flex items-center gap-2"
                    style={{ color: '#25D366', backgroundColor: 'white', borderColor: 'white' }}
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
                    className="flex items-center gap-2"
                    style={{ color: '#1877F2', backgroundColor: 'white', borderColor: 'white' }}
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
                    className="flex items-center gap-2"
                    style={{ color: '#1DA1F2', backgroundColor: 'white', borderColor: 'white' }}
                    type="button"
                  >
                    <Share2 className="w-4 h-4" />
                    Twitter
                  </Button>
                </div>
              </div>

              {/* Copy Link */}
              <div>
                <Label style={{ color: '#1560a2' }}>Referral Link</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={referralLink}
                    readOnly
                    data-testid="input-contractor-referral-link"
                    className="text-sm"
                    style={{ backgroundColor: 'white', color: '#1560a2' }}
                  />
                  <Button
                    onClick={() => copyToClipboard(referralLink)}
                    variant="outline"
                    size="icon"
                    data-testid="button-copy-contractor-link"
                    title="Copy referral link"
                    type="button"
                    style={{ backgroundColor: '#1560a2', color: 'white', borderColor: '#1560a2' }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Share with fellow contractors and potential clients. They get the full Home Base experience while helping you save $1!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Shareable Graphics */}
          <Card style={{ backgroundColor: '#f2f2f2' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: '#1560a2' }}>
                <ImageIcon className="w-5 h-5" style={{ color: '#1560a2' }} />
                Shareable Graphics
              </CardTitle>
              <CardDescription>
                Download personalized graphics with your referral code to share on social media
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Click download on any graphic below to get a personalized version with your referral code <span className="font-mono font-bold" style={{ color: '#1560a2' }}>{referralCode}</span> already included!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Instagram Post */}
                <div className="bg-white rounded-lg p-3 space-y-2">
                  <div className="aspect-square rounded overflow-hidden border-2 border-gray-200">
                    <img src={instagramPostImg} alt="Instagram Post Template" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm" style={{ color: '#1560a2' }}>Instagram Post</h4>
                    <p className="text-xs text-gray-600">Square format - 1080x1080px</p>
                    <Button
                      onClick={() => downloadImageWithCode(instagramPostImg, `homebase-contractor-instagram-${referralCode}.png`, { x: 540, y: 950 })}
                      size="sm"
                      className="w-full"
                      style={{ backgroundColor: '#1560a2', color: 'white' }}
                      data-testid="button-download-contractor-instagram-post"
                      type="button"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Instagram Story */}
                <div className="bg-white rounded-lg p-3 space-y-2">
                  <div className="aspect-[9/16] rounded overflow-hidden border-2 border-gray-200 max-h-64">
                    <img src={instagramStoryImg} alt="Instagram Story Template" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm" style={{ color: '#1560a2' }}>Instagram Story</h4>
                    <p className="text-xs text-gray-600">Vertical format - 1080x1920px</p>
                    <Button
                      onClick={() => downloadImageWithCode(instagramStoryImg, `homebase-contractor-story-${referralCode}.png`, { x: 540, y: 1750 })}
                      size="sm"
                      className="w-full"
                      style={{ backgroundColor: '#1560a2', color: 'white' }}
                      data-testid="button-download-contractor-instagram-story"
                      type="button"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Facebook/Twitter */}
                <div className="bg-white rounded-lg p-3 space-y-2">
                  <div className="aspect-[16/9] rounded overflow-hidden border-2 border-gray-200">
                    <img src={facebookTwitterImg} alt="Facebook/Twitter Template" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm" style={{ color: '#1560a2' }}>Facebook/Twitter</h4>
                    <p className="text-xs text-gray-600">Horizontal - 1200x630px</p>
                    <Button
                      onClick={() => downloadImageWithCode(facebookTwitterImg, `homebase-contractor-facebook-${referralCode}.png`, { x: 600, y: 580 })}
                      size="sm"
                      className="w-full"
                      style={{ backgroundColor: '#1560a2', color: 'white' }}
                      data-testid="button-download-contractor-facebook-twitter"
                      type="button"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-blue-800">
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

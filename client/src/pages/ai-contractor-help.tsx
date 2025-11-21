import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Search, Loader2, AlertCircle } from "lucide-react";

interface AIRecommendation {
  possibleCauses: string;
  recommendedServices: string[];
  explanation: string;
}

export default function AIContractorHelp() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [problem, setProblem] = useState("");
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);

  const recommendationMutation = useMutation({
    mutationFn: async (problemDescription: string) => {
      const response = await apiRequest(
        '/api/ai/contractor-recommendation',
        'POST',
        { problem: problemDescription }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }
      
      return response.json();
    },
    onSuccess: (data: AIRecommendation) => {
      // Check if this is a refusal from AI
      if (data.recommendedServices && data.recommendedServices.length === 0) {
        toast({
          title: "Off-Topic Question",
          description: data.explanation || "Please ask about home maintenance or contractor-related issues.",
          variant: "destructive",
        });
        setRecommendation(null);
        return;
      }
      
      setRecommendation(data);
      toast({
        title: "Recommendation Ready",
        description: "AI has analyzed your problem and provided contractor recommendations.",
      });
    },
    onError: (error: any) => {
      // Handle OFF_TOPIC errors with helpful examples
      if (error.code === 'OFF_TOPIC') {
        toast({
          title: "Please Ask About Home Issues",
          description: error.message || "I can only help with home maintenance and contractor-related questions.",
          variant: "destructive",
        });
        
        // Show examples in the UI
        if (error.examples && error.examples.length > 0) {
          setTimeout(() => {
            toast({
              title: "Example Questions:",
              description: error.examples.slice(0, 2).join('\n• '),
            });
          }, 500);
        }
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to get recommendation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (problem.trim().length < 10) {
      toast({
        title: "More Details Needed",
        description: "Please provide a more detailed description of your problem (at least 10 characters).",
        variant: "destructive",
      });
      return;
    }

    setRecommendation(null);
    recommendationMutation.mutate(problem);
  };

  const handleFindContractor = (serviceType: string) => {
    // Navigate to contractor search with pre-filled service type
    setLocation(`/find-contractors?service=${encodeURIComponent(serviceType)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Who Should I Contact?
          </h1>
          <p className="text-gray-600">
            Not sure which contractor you need? Describe your problem and get AI-powered recommendations.
          </p>
        </div>

        {/* Problem Input Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Sparkles className="w-5 h-5" />
              Describe Your Problem
            </CardTitle>
            <CardDescription>
              Tell us what's happening in your home, and we'll recommend the right type of contractor to contact.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Example: My toilet keeps running and won't stop filling with water..."
                className="min-h-[150px] resize-none text-purple-900 placeholder:text-purple-400"
                disabled={recommendationMutation.isPending}
                data-testid="textarea-problem-description"
              />
              
              <Button
                type="submit"
                disabled={recommendationMutation.isPending || problem.trim().length < 10}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                data-testid="button-get-recommendation"
              >
                {recommendationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get AI Recommendation
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* AI Recommendation Display */}
        {recommendation && (
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <AlertCircle className="w-5 h-5" />
                AI Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Possible Causes */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Possible Causes</h3>
                <p className="text-gray-700" data-testid="text-possible-causes">
                  {recommendation.possibleCauses}
                </p>
              </div>

              {/* Recommended Services */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Recommended Contractor Types</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {recommendation.recommendedServices.map((service, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium"
                      data-testid={`badge-recommended-service-${index}`}
                    >
                      {service}
                    </span>
                  ))}
                </div>
                <p className="text-gray-700" data-testid="text-explanation">
                  {recommendation.explanation}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Find Contractors</h3>
                <div className="flex flex-wrap gap-3">
                  {recommendation.recommendedServices.map((service, index) => (
                    <Button
                      key={index}
                      onClick={() => handleFindContractor(service)}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid={`button-find-contractor-${index}`}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Find {service}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Example Problems */}
        {!recommendation && !recommendationMutation.isPending && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-700">Example Problems</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>My toilet keeps running and won't stop filling with water</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>The electrical outlet in my kitchen stopped working</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>I have water stains on my ceiling after the rain</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>My air conditioner is making loud noises and not cooling properly</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>There's a musty smell in my basement and I see dark spots on the walls</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

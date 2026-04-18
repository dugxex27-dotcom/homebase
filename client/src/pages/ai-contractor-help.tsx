import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PageHero } from "@/components/page-hero";
import {
  Sparkles, Search, Loader2, AlertCircle, MessageCircle,
  Send, RotateCcw, HardHat, Wrench, Zap, Droplets,
  Flame, Wind, Bug, ShieldAlert
} from "lucide-react";

interface AIRecommendation {
  possibleCauses: string;
  recommendedServices: string[];
  explanation: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  needsProfessional?: boolean;
  contractorType?: string | null;
}

const QUICK_START_PROMPTS = [
  { icon: Droplets, label: "Leaking faucet", prompt: "My faucet is dripping or leaking. How do I figure out what's wrong?" },
  { icon: Wind, label: "AC not cooling", prompt: "My air conditioner is running but the house isn't cooling down." },
  { icon: Zap, label: "Outlet not working", prompt: "An electrical outlet stopped working. What should I check?" },
  { icon: Flame, label: "Furnace won't start", prompt: "My furnace won't turn on or isn't heating the house." },
  { icon: Droplets, label: "Water stain on ceiling", prompt: "I noticed a water stain on my ceiling. What could be causing it?" },
  { icon: Bug, label: "Pest problem", prompt: "I think I have a pest infestation in my home. How do I identify what it is?" },
  { icon: Wrench, label: "Running toilet", prompt: "My toilet keeps running and won't stop. How do I fix it?" },
  { icon: ShieldAlert, label: "Musty smell", prompt: "There's a musty or mildew smell in my home. What's causing it?" },
];

function ChatBubble({ message, onFindContractor }: { message: ChatMessage; onFindContractor: (type: string) => void }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mr-3 flex-shrink-0 mt-1">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? "order-first" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-br-sm"
              : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
          }`}
        >
          {message.content}
        </div>
        {message.needsProfessional && message.contractorType && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700 font-medium mb-2 flex items-center gap-1">
              <HardHat className="w-3 h-3" />
              Professional help recommended
            </p>
            <Button
              size="sm"
              onClick={() => onFindContractor(message.contractorType!)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs"
            >
              <Search className="w-3 h-3 mr-1" />
              Find a {message.contractorType}
            </Button>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center ml-3 flex-shrink-0 mt-1">
          <span className="text-xs font-bold text-gray-600">You</span>
        </div>
      )}
    </div>
  );
}

function TroubleshootTab({ onSwitchToContractor }: { onSwitchToContractor: (query?: string) => void }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const troubleshootMutation = useMutation({
    mutationFn: async (chatMessages: ChatMessage[]) => {
      const response = await apiRequest('/api/ai/troubleshoot', 'POST', {
        messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
      });
      if (!response.ok) {
        const err = await response.json();
        throw err;
      }
      return response.json() as Promise<{ reply: string; needsProfessional: boolean; contractorType: string | null }>;
    },
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          needsProfessional: data.needsProfessional,
          contractorType: data.contractorType,
        },
      ]);
    },
    onError: (error: any) => {
      if (error.code === 'OFF_TOPIC') {
        toast({
          title: "Home issues only",
          description: "I can only help with home-related problems like plumbing, electrical, HVAC, and more.",
          variant: "destructive",
        });
        setMessages(prev => prev.slice(0, -1));
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to get a response. Please try again.",
        variant: "destructive",
      });
      setMessages(prev => prev.slice(0, -1));
    },
  });

  const sendMessage = (content: string) => {
    if (!content.trim() || troubleshootMutation.isPending) return;
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: content.trim() }];
    setMessages(newMessages);
    setInput("");
    troubleshootMutation.mutate(newMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleFindContractor = (contractorType: string) => {
    onSwitchToContractor(contractorType);
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[600px]">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">What's going on with your home?</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              Describe your problem and I'll walk you through diagnosing it step by step. I'll suggest DIY fixes when it's safe, and tell you when you need a pro.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {QUICK_START_PROMPTS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => sendMessage(chip.prompt)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left shadow-sm"
                >
                  <chip.icon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} onFindContractor={handleFindContractor} />
            ))}
            {troubleshootMutation.isPending && (
              <div className="flex justify-start mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mr-3 flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        {!isEmpty && (
          <div className="flex justify-end mb-2">
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Start over
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your home issue... (Enter to send, Shift+Enter for new line)"
            className="resize-none min-h-[48px] max-h-[120px] text-sm"
            rows={2}
            disabled={troubleshootMutation.isPending}
            data-testid="textarea-troubleshoot-input"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || troubleshootMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex-shrink-0 h-12 w-12 p-0"
            data-testid="button-send-message"
          >
            {troubleshootMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          HomeBase AI • For emergencies (gas leak, fire, flooding) call 911 immediately
        </p>
      </div>
    </div>
  );
}

export default function AIContractorHelp() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("troubleshoot");
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
    },
    onError: (error: any) => {
      if (error.code === 'OFF_TOPIC') {
        toast({
          title: "Please Ask About Home Issues",
          description: error.message || "I can only help with home maintenance and contractor-related questions.",
          variant: "destructive",
        });
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
    setLocation(`/find-contractors?q=${encodeURIComponent(serviceType)}&service=${encodeURIComponent(serviceType)}`);
  };

  const handleSwitchToContractor = (query?: string) => {
    if (query) {
      setProblem(`I need help finding a ${query}`);
    }
    setActiveTab("contractor");
  };

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="Homeowner"
        title="HomeBase AI"
        subtitle="Diagnose issues, get DIY fixes, and find the right contractor"
      />
      <div className="container mx-auto py-8 px-4 max-w-3xl">

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
            <TabsTrigger value="troubleshoot" className="flex items-center gap-2 text-sm font-medium" data-testid="tab-troubleshoot">
              <MessageCircle className="w-4 h-4" />
              Troubleshoot My Issue
            </TabsTrigger>
            <TabsTrigger value="contractor" className="flex items-center gap-2 text-sm font-medium" data-testid="tab-contractor">
              <HardHat className="w-4 h-4" />
              Find a Contractor
            </TabsTrigger>
          </TabsList>

          {/* Troubleshoot Tab */}
          <TabsContent value="troubleshoot" className="mt-0">
            <Card className="border-0 shadow-md overflow-hidden">
              <TroubleshootTab onSwitchToContractor={handleSwitchToContractor} />
            </Card>
          </TabsContent>

          {/* Find a Contractor Tab */}
          <TabsContent value="contractor" className="mt-0">
            <Card className="mb-6 border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Sparkles className="w-5 h-5" />
                  Who Should I Contact?
                </CardTitle>
                <CardDescription>
                  Describe your problem and get AI-powered contractor recommendations.
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

            {recommendation && (
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <AlertCircle className="w-5 h-5" />
                    AI Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Possible Causes</h3>
                    <p className="text-gray-700" data-testid="text-possible-causes">
                      {recommendation.possibleCauses}
                    </p>
                  </div>
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

            {!recommendation && !recommendationMutation.isPending && (
              <Card className="bg-blue-50 border-blue-200 border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-blue-700 text-base">Example Problems</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    {[
                      "My toilet keeps running and won't stop filling with water",
                      "The electrical outlet in my kitchen stopped working",
                      "I have water stains on my ceiling after the rain",
                      "My air conditioner is making loud noises and not cooling properly",
                      "There's a musty smell in my basement and I see dark spots on the walls",
                    ].map((ex, i) => (
                      <li
                        key={i}
                        className="flex items-start cursor-pointer hover:text-blue-700 transition-colors"
                        onClick={() => setProblem(ex)}
                      >
                        <span className="text-blue-600 mr-2 mt-0.5">•</span>
                        <span>{ex}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

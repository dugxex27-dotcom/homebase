import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Send, User, Calendar, Plus, Users, FileText, DollarSign, Clock, Star } from "lucide-react";
import type { User as UserType, Conversation, Message, Contractor, Proposal, ContractorReview } from "@shared/schema";

interface ConversationWithDetails extends Conversation {
  otherPartyName: string;
  unreadCount: number;
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const typedUser = user as UserType | undefined;
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({
    subject: "",
    message: "",
    selectedContractors: [] as string[]
  });
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
    wouldRecommend: true
  });

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<ConversationWithDetails[]>({
    queryKey: ['/api/conversations'],
    enabled: !!typedUser
  });

  // Fetch contractors for homeowners to compose new messages
  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ['/api/contractors'],
    enabled: !!typedUser && typedUser.role === 'homeowner'
  });

  // Fetch proposals for homeowners
  const { data: proposals = [], isLoading: proposalsLoading } = useQuery<Proposal[]>({
    queryKey: ['/api/proposals'],
    enabled: !!typedUser && typedUser.role === 'homeowner'
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/conversations', selectedConversationId, 'messages'],
    enabled: !!selectedConversationId
  });

  // Get contractor ID from selected conversation
  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const contractorIdForReview = typedUser?.role === 'homeowner' ? selectedConversation?.contractorId : null;

  // Fetch existing reviews for this contractor from this homeowner
  const { data: existingReviews = [] } = useQuery<ContractorReview[]>({
    queryKey: ['/api/reviews/my-reviews'],
    enabled: !!typedUser && typedUser.role === 'homeowner'
  });

  const existingReview = existingReviews.find(r => r.contractorId === contractorIdForReview);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string }) => {
      const response = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(messageData)
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedConversationId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setNewMessage("");
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversationId) return;
    sendMessageMutation.mutate({ message: newMessage });
  };

  // Send message to multiple contractors
  const sendBulkMessageMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; contractorIds: string[] }) => {
      return await apiRequest('POST', '/api/conversations/bulk', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setIsComposeDialogOpen(false);
      setComposeForm({ subject: "", message: "", selectedContractors: [] });
      toast({
        title: "Messages Sent",
        description: `Your message was sent to ${composeForm.selectedContractors.length} contractor${composeForm.selectedContractors.length > 1 ? 's' : ''}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send messages.",
        variant: "destructive",
      });
    }
  });

  const handleComposeSubmit = () => {
    if (!composeForm.subject.trim() || !composeForm.message.trim() || composeForm.selectedContractors.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all fields and select at least one contractor.",
        variant: "destructive",
      });
      return;
    }
    sendBulkMessageMutation.mutate({
      subject: composeForm.subject,
      message: composeForm.message,
      contractorIds: composeForm.selectedContractors
    });
  };

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: typeof reviewForm) => {
      return await apiRequest('POST', `/api/contractors/${contractorIdForReview}/reviews`, reviewData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/my-reviews'] });
      toast({
        title: "Review Submitted",
        description: "Thank you for your review!",
      });
      setReviewForm({ rating: 5, comment: "", wouldRecommend: true });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review.",
        variant: "destructive",
      });
    }
  });

  const handleSubmitReview = () => {
    if (!reviewForm.comment.trim()) {
      toast({
        title: "Error",
        description: "Please add a comment to your review.",
        variant: "destructive",
      });
      return;
    }
    submitReviewMutation.mutate(reviewForm);
  };

  const handleContractorSelection = (contractorId: string, checked: boolean) => {
    setComposeForm(prev => ({
      ...prev,
      selectedContractors: checked 
        ? [...prev.selectedContractors, contractorId]
        : prev.selectedContractors.filter(id => id !== contractorId)
    }));
  };

  if (!typedUser) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#2c0f5b' }}>
        <Header />
        <div className="container mx-auto p-6">
          <Card className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700" style={{ backgroundColor: '#f2f2f2' }}>
            <CardContent className="p-8 text-center">
              <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
              <p className="text-gray-600">Please sign in to view your messages.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const bgColor = typedUser.role === 'contractor' 
    ? 'dark:bg-gray-900' 
    : '';
  
  const heroGradient = typedUser.role === 'contractor'
    ? ''
    : '';
  
  const accentColor = typedUser.role === 'contractor'
    ? 'text-blue-800 dark:text-blue-400'
    : 'text-purple-600 dark:text-purple-400';

  return (
    <div className={`min-h-screen ${bgColor}`} style={typedUser.role === 'contractor' ? { backgroundColor: '#1560a2' } : { backgroundColor: '#2c0f5b' }}>
      <Header />
      
      {/* Hero Section */}
      <section className={`${heroGradient} pt-12 pb-4`} style={typedUser.role === 'contractor' ? { backgroundColor: '#1560a2' } : { backgroundColor: '#2c0f5b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6" style={typedUser.role === 'contractor' ? { color: 'white' } : { color: '#ffffff' }}>
              <span className={typedUser.role === 'contractor' ? '' : ''} style={typedUser.role === 'contractor' ? { color: 'white' } : { color: '#ffffff' }}>Messages</span>
            </h1>
            <p className="text-xl max-w-3xl mx-auto mb-8" style={typedUser.role === 'contractor' ? { color: '#afd6f9' } : { color: '#b6a6f4' }}>
              {typedUser.role === 'homeowner' 
                ? 'Communicate with contractors about your projects'
                : 'Stay in touch with your homeowner clients'
              }
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto p-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations and Proposals List */}
        <Card className="lg:col-span-1 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700" style={{ backgroundColor: '#f2f2f2' }}>
          {typedUser.role === 'homeowner' ? (
            <Tabs defaultValue="conversations" className="w-full">
              <TabsList className="w-full" style={{ backgroundColor: '#b6a6f4', color: 'white' }}>
                <TabsTrigger value="conversations" className="flex-1" style={{ color: 'white' }}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                </TabsTrigger>
                <TabsTrigger value="proposals" className="flex-1" style={{ color: 'white' }}>
                  <FileText className="h-4 w-4 mr-2" />
                  Proposals
                </TabsTrigger>
              </TabsList>

              <TabsContent value="conversations" className="mt-0">
                <ScrollArea className="h-[550px]">
                  {conversationsLoading ? (
                    <div className="p-4 text-center text-gray-500">Loading conversations...</div>
                  ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No conversations yet. Contact a contractor to start messaging.
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <div key={conversation.id}>
                        <div
                          className={`p-4 cursor-pointer hover:bg-gray-50 ${
                            selectedConversationId === conversation.id 
                              ? 'bg-blue-50 border-r-2 border-blue-500'
                              : ''
                          }`}
                          onClick={() => setSelectedConversationId(conversation.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-500" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900">{conversation.otherPartyName}</h3>
                                <p className="text-sm text-gray-600 truncate">{conversation.subject}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Calendar className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-400">
                                    {new Date(conversation.lastMessageAt || conversation.createdAt || new Date()).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="ml-2">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Separator />
                      </div>
                    ))
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="proposals" className="mt-0">
                <ScrollArea className="h-[550px]">
                  {proposalsLoading ? (
                    <div className="p-4 text-center text-gray-500">Loading proposals...</div>
                  ) : proposals.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No proposals yet. Contractors you've messaged can send you proposals.
                    </div>
                  ) : (
                    proposals.map((proposal) => (
                      <div key={proposal.id} className="p-4 border-b hover:bg-gray-50">
                        <div className="mb-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">{proposal.title}</h3>
                            <Badge variant={
                              proposal.status === 'sent' ? 'default' :
                              proposal.status === 'accepted' ? 'default' :
                              proposal.status === 'rejected' ? 'destructive' :
                              'secondary'
                            } style={
                              proposal.status === 'accepted' ? { backgroundColor: '#10b981', color: 'white' } : {}
                            }>
                              {proposal.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{proposal.description}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-2">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>${parseFloat(proposal.estimatedCost).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{proposal.estimatedDuration}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          Valid until: {new Date(proposal.validUntil).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            // Contractor view - just conversations
            <>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Conversations
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {conversationsLoading ? (
                    <div className="p-4 text-center text-gray-500">Loading conversations...</div>
                  ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No conversations yet.
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <div key={conversation.id}>
                        <div
                          className={`p-4 cursor-pointer hover:bg-gray-50 ${
                            selectedConversationId === conversation.id 
                              ? 'bg-blue-50 border-r-2 border-blue-800'
                              : ''
                          }`}
                          onClick={() => setSelectedConversationId(conversation.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-500" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900">{conversation.otherPartyName}</h3>
                                <p className="text-sm text-gray-600 truncate">{conversation.subject}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Calendar className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-400">
                                    {new Date(conversation.lastMessageAt || conversation.createdAt || new Date()).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="ml-2">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Separator />
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </>
          )}
        </Card>

        {/* Messages Area */}
        <Card className="lg:col-span-2 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700" style={{ backgroundColor: '#f2f2f2' }}>
          {selectedConversationId ? (
            <>
              <CardHeader>
                <CardTitle>
                  {conversations.find(c => c.id === selectedConversationId)?.subject || 'Conversation'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[500px]">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="text-center text-gray-500">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderId === typedUser.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              message.senderId === typedUser.id
                                ? typedUser.role === 'contractor'
                                  ? 'bg-blue-800 text-white'
                                  : 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.message}</p>
                            <p className={`text-xs mt-1 ${
                              message.senderId === typedUser.id 
                                ? typedUser.role === 'contractor'
                                  ? 'text-blue-100'
                                  : 'text-blue-100'
                                : 'text-gray-500'
                            }`}>
                              {new Date(message.createdAt || new Date()).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="resize-none"
                      rows={2}
                      style={{ backgroundColor: '#ffffff' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      className={`self-end ${
                        typedUser.role === 'contractor'
                          ? 'bg-blue-800 hover:bg-blue-900 text-white'
                          : ''
                      }`}
                      style={{ backgroundColor: '#1560a2', color: 'white' }}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Review Section - Only for homeowners viewing contractor conversations after messages exchanged */}
                {typedUser?.role === 'homeowner' && contractorIdForReview && messages.length > 0 && (
                  <div className="p-4 border-t bg-white" data-testid="section-review">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                      <Star className="h-5 w-5" style={{ color: '#b6a6f4' }} />
                      {existingReview ? 'Your Review' : 'Leave a Review'}
                    </h3>
                    
                    {existingReview ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-5 w-5 ${star <= existingReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">
                            {new Date(existingReview.createdAt || new Date()).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{existingReview.comment}</p>
                        {existingReview.wouldRecommend && (
                          <p className="text-sm text-green-600 mt-2">✓ Would recommend</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-gray-700">Rating</Label>
                          <div className="flex gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                                className="focus:outline-none"
                                data-testid={`button-rating-${star}`}
                              >
                                <Star
                                  className={`h-6 w-6 cursor-pointer transition-colors ${
                                    star <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="review-comment" className="text-gray-700">Comment</Label>
                          <Textarea
                            id="review-comment"
                            placeholder="Share your experience with this contractor..."
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                            className="resize-none mt-1"
                            rows={3}
                            data-testid="input-review-comment"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="would-recommend"
                            checked={reviewForm.wouldRecommend}
                            onCheckedChange={(checked) => setReviewForm(prev => ({ ...prev, wouldRecommend: checked === true }))}
                            data-testid="checkbox-would-recommend"
                          />
                          <Label htmlFor="would-recommend" className="text-gray-700 cursor-pointer">
                            I would recommend this contractor
                          </Label>
                        </div>
                        
                        <Button
                          onClick={handleSubmitReview}
                          disabled={submitReviewMutation.isPending || !reviewForm.comment.trim()}
                          className="w-full"
                          style={{ backgroundColor: '#b6a6f4', color: 'white' }}
                          data-testid="button-submit-review"
                        >
                          {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[500px]">
              <div className="text-center text-gray-500">
                <MessageCircle className="mx-auto h-12 w-12 mb-4" />
                <p>Select a conversation to start messaging</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
      </div>
    </div>
  );
}
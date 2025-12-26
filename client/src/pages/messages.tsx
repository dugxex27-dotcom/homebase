import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, User, Calendar, Plus, Users, FileText, DollarSign, Clock, Star, Image as ImageIcon, X, File, Paperclip, Wifi, WifiOff, CheckCheck, Check } from "lucide-react";
import { insertProposalSchema } from "@shared/schema";
import { z } from "zod";
import type { User as UserType, Conversation, Message, Contractor, Proposal, ContractorReview } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Array<{file: File, preview: string, type: string}>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Additional state for compose, proposals, and reviews
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({
    subject: "",
    message: "",
    selectedContractors: [] as string[]
  });
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
    wouldRecommend: true
  });
  const [isReviewSectionOpen, setIsReviewSectionOpen] = useState(false);
  
  // Proposal form schema and setup
  const proposalFormSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    scope: z.string().min(1, "Scope of work is required"),
    serviceType: z.string().min(1, "Service type is required"),
    estimatedCost: z.string()
      .min(1, "Estimated cost is required")
      .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be a valid positive number"),
    estimatedDuration: z.string().min(1, "Estimated duration is required"),
    validUntil: z.string().min(1, "Valid until date is required"),
    materials: z.string().optional(),
    warrantyPeriod: z.string().optional(),
    customerNotes: z.string().optional(),
    internalNotes: z.string().optional(),
  });

  type ProposalFormData = z.infer<typeof proposalFormSchema>;

  const proposalForm = useForm<ProposalFormData>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      title: "",
      description: "",
      scope: "",
      estimatedCost: "",
      estimatedDuration: "",
      materials: "",
      warrantyPeriod: "",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      serviceType: "",
      customerNotes: "",
      internalNotes: "",
    },
  });

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<ConversationWithDetails[]>({
    queryKey: ['/api/conversations'],
    enabled: !!typedUser
  });

  // Fetch previously used contractors for homeowners to compose new messages
  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ['/api/contractors/previously-used'],
    enabled: !!typedUser && typedUser.role === 'homeowner'
  });

  // Fetch proposals for homeowners
  const { data: proposals = [] } = useQuery<Proposal[]>({
    queryKey: ['/api/proposals'],
    enabled: !!typedUser && typedUser.role === 'homeowner'
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/conversations', selectedConversationId, 'messages'],
    enabled: !!selectedConversationId,
    refetchInterval: false  // We'll use WebSocket for real-time updates
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

  // WebSocket callbacks
  const handleNewMessage = useCallback((conversationId: string, message: Message) => {
    console.log('[Messages] Received new message via WebSocket:', message);
    
    // Update messages cache
    queryClient.setQueryData<Message[]>(
      ['/api/conversations', conversationId, 'messages'],
      (oldMessages) => oldMessages ? [...oldMessages, message] : [message]
    );
    
    // Update conversations list
    queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    
    // Scroll to bottom
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  const handleTypingIndicator = useCallback((conversationId: string, userId: string, typing: boolean) => {
    if (conversationId === selectedConversationId && userId !== typedUser?.id) {
      setOtherUserTyping(typing);
      
      // Auto-hide after 3 seconds
      if (typing) {
        setTimeout(() => setOtherUserTyping(false), 3000);
      }
    }
  }, [selectedConversationId, typedUser?.id]);

  const handleReadReceipt = useCallback((conversationId: string, messageIds: string[], readBy: string) => {
    console.log('[Messages] Read receipt:', { conversationId, messageIds, readBy });
    
    // Update messages cache to mark as read
    queryClient.setQueryData<Message[]>(
      ['/api/conversations', conversationId, 'messages'],
      (oldMessages) => {
        if (!oldMessages) return oldMessages;
        return oldMessages.map(msg => 
          messageIds.includes(msg.id) 
            ? { ...msg, isRead: true, readAt: new Date() }
            : msg
        );
      }
    );
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log('[Messages] WebSocket connection:', connected ? 'Connected' : 'Disconnected');
  }, []);

  // Initialize WebSocket
  const {
    connected: wsConnected,
    joinConversation,
    leaveConversation,
    sendTyping,
    markAsRead,
    broadcastMessage
  } = useWebSocket(!!typedUser, {
    onMessage: handleNewMessage,
    onTyping: handleTypingIndicator,
    onReadReceipt: handleReadReceipt,
    onConnectionChange: handleConnectionChange
  });

  // Join/leave conversations when selection changes
  useEffect(() => {
    if (selectedConversationId && wsConnected) {
      joinConversation(selectedConversationId);
      return () => leaveConversation(selectedConversationId);
    }
  }, [selectedConversationId, wsConnected, joinConversation, leaveConversation]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (selectedConversationId && messages.length > 0 && wsConnected) {
      const unreadMessageIds = messages
        .filter(m => !m.isRead && m.senderId !== typedUser?.id)
        .map(m => m.id);
      
      if (unreadMessageIds.length > 0) {
        // Mark as read in database
        fetch(`/api/conversations/${selectedConversationId}/messages/mark-read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        
        // Broadcast read receipt via WebSocket
        markAsRead(selectedConversationId, unreadMessageIds);
      }
    }
  }, [selectedConversationId, messages, typedUser?.id, wsConnected, markAsRead]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; imageUrl?: string; attachments?: string[] }) => {
      const response = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(messageData)
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json() as Promise<Message>;
    },
    onSuccess: (newMessage) => {
      // Broadcast via WebSocket
      if (selectedConversationId) {
        broadcastMessage(selectedConversationId, newMessage);
      }
      
      // Update local cache optimistically
      queryClient.setQueryData<Message[]>(
        ['/api/conversations', selectedConversationId, 'messages'],
        (oldMessages) => oldMessages ? [...oldMessages, newMessage] : [newMessage]
      );
      
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setNewMessage("");
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedFiles([]);
    }
  });

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage && selectedFiles.length === 0) || !selectedConversationId) return;

    let imageUrl: string | undefined;
    let attachmentUrls: string[] = [];

    // Upload single image if selected
    if (selectedImage) {
      try {
        const response = await fetch('/api/upload/message-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ imageData: selectedImage })
        });
        
        if (!response.ok) throw new Error('Failed to upload image');
        const data = await response.json();
        imageUrl = data.url;
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload image. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Upload multiple files if selected
    if (selectedFiles.length > 0) {
      try {
        const filesData = await Promise.all(
          selectedFiles.map(async ({ file, preview }) => {
            const reader = new FileReader();
            return new Promise<{fileData: string, fileName: string, fileType: string}>((resolve) => {
              reader.onloadend = () => {
                resolve({
                  fileData: reader.result as string,
                  fileName: file.name,
                  fileType: file.type
                });
              };
              reader.readAsDataURL(file);
            });
          })
        );

        const response = await fetch('/api/upload/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ files: filesData })
        });
        
        if (!response.ok) throw new Error('Failed to upload files');
        const data = await response.json();
        attachmentUrls = data.urls;
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload files. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    sendMessageMutation.mutate({ 
      message: newMessage || "",
      imageUrl,
      attachments: attachmentUrls.length > 0 ? attachmentUrls : undefined
    });
  };

  // Compose new conversation mutation (homeowners only)
  const composeConversationMutation = useMutation({
    mutationFn: async (data: typeof composeForm) => {
      return await apiRequest('POST', '/api/conversations', {
        contractorIds: data.selectedContractors,
        subject: data.subject,
        message: data.message
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setIsComposeDialogOpen(false);
      setComposeForm({ subject: "", message: "", selectedContractors: [] });
      toast({
        title: "Success",
        description: "Conversation started successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation.",
        variant: "destructive",
      });
    }
  });

  // Create proposal mutation (contractors only)
  const createProposalMutation = useMutation({
    mutationFn: async (proposalData: any) => {
      const response = await fetch(`/api/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(proposalData)
      });
      if (!response.ok) throw new Error('Failed to create proposal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      setIsProposalDialogOpen(false);
      proposalForm.reset();
      toast({
        title: "Proposal Created",
        description: "Your proposal has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create proposal.",
        variant: "destructive",
      });
    }
  });

  const handleCreateProposal = (data: ProposalFormData) => {
    if (!selectedConversation) return;
    
    const proposalData = {
      ...data,
      homeownerId: selectedConversation.homeownerId,
      contractorId: typedUser?.id,
      materials: (data.materials || "").split(',').map(item => item.trim()).filter(item => item.length > 0),
      estimatedCost: parseFloat(data.estimatedCost).toString(),
      status: "sent" as const,
    };
    
    createProposalMutation.mutate(proposalData);
  };

  // Submit review mutation (homeowners only)
  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: typeof reviewForm) => {
      return await apiRequest('POST', `/api/contractors/${contractorIdForReview}/reviews`, reviewData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/my-reviews'] });
      setReviewForm({ rating: 5, comment: "", wouldRecommend: true });
      setIsReviewSectionOpen(false);
      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });
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
    submitReviewMutation.mutate(reviewForm);
  };

  // Handle typing indicator with debounce
  const handleTypingChange = (value: string) => {
    setNewMessage(value);
    
    if (!selectedConversationId || !wsConnected) return;
    
    // Send typing=true
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      sendTyping(selectedConversationId, true);
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to send typing=false after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(selectedConversationId, false);
    }, 2000);
  };

  if (!typedUser) {
    return (
      <div className="container mx-auto p-6">
        <Card className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700" style={{ backgroundColor: '#f2f2f2' }}>
          <CardContent className="p-8 text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-gray-600">Please sign in to view your messages.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header Section */}
      <section className="py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Messages</h1>
            <div className="flex items-center gap-1.5" data-testid="websocket-status">
              {wsConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-red-500 font-medium">Disconnected</span>
                </>
              )}
            </div>
          </div>
          <p className="text-gray-600">
            Chat in real-time with {typedUser.role === 'homeowner' ? 'contractors' : 'homeowners'}
          </p>
        </div>
      </section>

      {/* Main Content - Two-Panel Messenger Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[600px] sm:h-[700px]">
          
          {/* Left Panel - Conversation List */}
          <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                Conversations
              </h2>
              
              {/* Compose Button - Homeowners only */}
              {typedUser.role === 'homeowner' && (
                <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="default" className="bg-purple-600 hover:bg-purple-700" data-testid="button-compose">
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Start a New Conversation</DialogTitle>
                      <DialogDescription>Select contractors and send them a message</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="subject">Subject *</Label>
                        <Input
                          id="subject"
                          value={composeForm.subject}
                          onChange={(e) => setComposeForm({...composeForm, subject: e.target.value})}
                          placeholder="e.g., Plumbing repair needed"
                          data-testid="input-compose-subject"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                          id="message"
                          value={composeForm.message}
                          onChange={(e) => setComposeForm({...composeForm, message: e.target.value})}
                          placeholder="Describe your issue or request..."
                          rows={4}
                          data-testid="textarea-compose-message"
                        />
                      </div>
                      
                      <div>
                        <Label>Select Contractors *</Label>
                        <ScrollArea className="h-48 border rounded-md p-3">
                          {contractors.length === 0 ? (
                            <p className="text-sm text-gray-500">No contractors available</p>
                          ) : (
                            <div className="space-y-2">
                              {contractors.map((contractor) => (
                                <div key={contractor.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`contractor-${contractor.id}`}
                                    checked={composeForm.selectedContractors.includes(contractor.id)}
                                    onCheckedChange={(checked) => {
                                      setComposeForm(prev => ({
                                        ...prev,
                                        selectedContractors: checked
                                          ? [...prev.selectedContractors, contractor.id]
                                          : prev.selectedContractors.filter(id => id !== contractor.id)
                                      }));
                                    }}
                                    data-testid={`checkbox-contractor-${contractor.id}`}
                                  />
                                  <label htmlFor={`contractor-${contractor.id}`} className="text-sm font-medium leading-none">
                                    {contractor.company} - {contractor.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsComposeDialogOpen(false)}
                          data-testid="button-cancel-compose"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => composeConversationMutation.mutate(composeForm)}
                          disabled={composeConversationMutation.isPending || !composeForm.subject || !composeForm.message || composeForm.selectedContractors.length === 0}
                          className="bg-purple-600 hover:bg-purple-700"
                          data-testid="button-send-compose"
                        >
                          {composeConversationMutation.isPending ? "Sending..." : "Send Message"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            <ScrollArea className="h-[calc(700px-73px)]">
              {conversationsLoading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No conversations yet</p>
                  <p className="text-sm text-gray-400 mt-1">Start a conversation to get help with your home</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedConversationId === conversation.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      data-testid={`conversation-${conversation.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {conversation.otherPartyName}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                            {conversation.subject}
                          </p>
                        </div>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="default" className="ml-2 bg-blue-600 text-white" data-testid={`unread-badge-${conversation.id}`}>
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {conversation.lastMessageAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Panel - Chat Window */}
          <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            {selectedConversationId ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {conversations.find(c => c.id === selectedConversationId)?.otherPartyName}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {conversations.find(c => c.id === selectedConversationId)?.subject}
                      </p>
                    </div>
                    
                    {/* Create Proposal Button - Contractors only */}
                    {typedUser.role === 'contractor' && (
                      <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" data-testid="button-create-proposal">
                            <FileText className="h-4 w-4 mr-1" />
                            Create Proposal
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-blue-600">
                          <DialogHeader>
                            <DialogTitle style={{ color: 'white' }}>
                              Create Proposal for {selectedConversation?.otherPartyName}
                            </DialogTitle>
                            <DialogDescription style={{ color: 'rgba(255,255,255,0.9)' }}>
                              Create a detailed proposal for this homeowner
                            </DialogDescription>
                          </DialogHeader>
                          
                          <Form {...proposalForm}>
                            <form onSubmit={proposalForm.handleSubmit(handleCreateProposal)} className="space-y-4">
                              <FormField
                                control={proposalForm.control}
                                name="title"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel style={{ color: 'white' }}>Title *</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid="input-proposal-title" className="bg-white text-black" />
                                    </FormControl>
                                    <FormMessage style={{ color: '#ffcccc' }} />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={proposalForm.control}
                                name="serviceType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel style={{ color: 'white' }}>Service Type *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-service-type" className="bg-white text-black">
                                          <SelectValue placeholder="Select service type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="plumbing">Plumbing</SelectItem>
                                        <SelectItem value="electrical">Electrical</SelectItem>
                                        <SelectItem value="hvac">HVAC</SelectItem>
                                        <SelectItem value="roofing">Roofing</SelectItem>
                                        <SelectItem value="landscaping">Landscaping</SelectItem>
                                        <SelectItem value="general-contracting">General Contracting</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage style={{ color: '#ffcccc' }} />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={proposalForm.control}
                                name="estimatedCost"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel style={{ color: 'white' }}>Estimated Cost ($) *</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.01" {...field} data-testid="input-estimated-cost" className="bg-white text-black" />
                                    </FormControl>
                                    <FormMessage style={{ color: '#ffcccc' }} />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={proposalForm.control}
                                name="estimatedDuration"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel style={{ color: 'white' }}>Estimated Duration *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="2-3 days, 1 week, etc." {...field} data-testid="input-estimated-duration" className="bg-white text-black" />
                                    </FormControl>
                                    <FormMessage style={{ color: '#ffcccc' }} />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={proposalForm.control}
                                name="validUntil"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel style={{ color: 'white' }}>Valid Until *</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} data-testid="input-valid-until" className="bg-white text-black" />
                                    </FormControl>
                                    <FormMessage style={{ color: '#ffcccc' }} />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="flex justify-end space-x-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsProposalDialogOpen(false)}
                                  data-testid="button-cancel-proposal"
                                  className="bg-white text-black"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={createProposalMutation.isPending}
                                  data-testid="button-submit-proposal"
                                  className="bg-white text-blue-600 hover:bg-gray-100"
                                >
                                  {createProposalMutation.isPending ? "Creating..." : "Create Proposal"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4 bg-gray-50 dark:bg-gray-900">
                  {messagesLoading ? (
                    <div className="text-center text-gray-500">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isOwnMessage = message.senderId === typedUser.id;
                        const showReadReceipt = isOwnMessage && message.isRead;
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                            data-testid={`message-${message.id}`}
                          >
                            <div
                              className={`max-w-[70%] p-3 rounded-lg ${
                                isOwnMessage
                                  ? typedUser.role === 'contractor'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-purple-600 text-white'
                                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              {(message as any).imageUrl && (
                                <img 
                                  src={(message as any).imageUrl} 
                                  alt="Message attachment" 
                                  className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90"
                                  onClick={() => window.open((message as any).imageUrl, '_blank')}
                                  data-testid={`message-image-${message.id}`}
                                />
                              )}
                              {(message as any).attachments && (message as any).attachments.length > 0 && (
                                <div className="mb-2 space-y-1">
                                  {(message as any).attachments.map((url: string, idx: number) => {
                                    const filename = url.split('/').pop() || 'file';
                                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
                                    const isPdf = /\.pdf$/i.test(filename);
                                    
                                    return isImage ? (
                                      <img 
                                        key={idx}
                                        src={url} 
                                        alt={`Attachment ${idx + 1}`} 
                                        className="rounded-lg mb-1 max-w-full cursor-pointer hover:opacity-90"
                                        onClick={() => window.open(url, '_blank')}
                                      />
                                    ) : (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 p-2 rounded ${
                                          isOwnMessage
                                            ? 'bg-white/20 hover:bg-white/30'
                                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                      >
                                        {isPdf ? <FileText className="h-4 w-4" /> : <File className="h-4 w-4" />}
                                        <span className="text-sm truncate">{filename}</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                              {message.message && <p className="whitespace-pre-wrap">{message.message}</p>}
                              
                              {/* Read receipt */}
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-xs opacity-70">
                                  {new Date(message.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {showReadReceipt && (
                                  <CheckCheck className="h-3 w-3 opacity-70" data-testid={`read-receipt-${message.id}`} />
                                )}
                                {isOwnMessage && !showReadReceipt && (
                                  <Check className="h-3 w-3 opacity-70" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                  
                  {/* Typing Indicator */}
                  {otherUserTyping && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-4" data-testid="typing-indicator">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span>typing...</span>
                    </div>
                  )}
                </ScrollArea>

                {/* Review Section - Homeowners only */}
                {typedUser.role === 'homeowner' && messages.length > 0 && contractorIdForReview && !existingReview && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    {!isReviewSectionOpen ? (
                      <Button
                        onClick={() => setIsReviewSectionOpen(true)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        data-testid="button-open-review"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Leave a Review for {selectedConversation?.otherPartyName}
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 dark:text-white">Leave a Review</h3>
                          <Button
                            onClick={() => setIsReviewSectionOpen(false)}
                            variant="ghost"
                            size="sm"
                            data-testid="button-close-review"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div>
                          <Label>Rating</Label>
                          <div className="flex gap-2 mt-2">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                type="button"
                                onClick={() => setReviewForm({...reviewForm, rating})}
                                className="focus:outline-none"
                                data-testid={`button-rating-${rating}`}
                              >
                                <Star
                                  className={`h-8 w-8 ${rating <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="review-comment">Comment *</Label>
                          <Textarea
                            id="review-comment"
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                            placeholder="Share your experience with this contractor..."
                            rows={3}
                            data-testid="textarea-review-comment"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="would-recommend"
                            checked={reviewForm.wouldRecommend}
                            onCheckedChange={(checked) => setReviewForm({...reviewForm, wouldRecommend: checked as boolean})}
                            data-testid="checkbox-would-recommend"
                          />
                          <Label htmlFor="would-recommend" className="cursor-pointer">
                            I would recommend this contractor
                          </Label>
                        </div>
                        
                        <Button
                          onClick={handleSubmitReview}
                          disabled={submitReviewMutation.isPending || !reviewForm.comment.trim()}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          data-testid="button-submit-review"
                        >
                          {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Composer */}
                <div className="p-4 border-t border-gray-100 bg-white">
                  {/* File Previews */}
                  {(imagePreview || selectedFiles.length > 0) && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {imagePreview && (
                        <div className="relative inline-block">
                          <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded" />
                          <button
                            onClick={() => {
                              setSelectedImage(null);
                              setImagePreview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="relative inline-block">
                          {file.type === 'image' ? (
                            <img src={file.preview} alt={file.file.name} className="h-20 w-20 object-cover rounded" />
                          ) : (
                            <div className="h-20 w-20 bg-gray-100 rounded flex items-center justify-center">
                              <File className="h-8 w-8 text-gray-500" />
                            </div>
                          )}
                          <button
                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="image-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast({
                            title: "Error",
                            description: "Image size must be less than 5MB",
                            variant: "destructive",
                          });
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setSelectedImage(reader.result as string);
                          setImagePreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      data-testid="button-upload-image"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    
                    <Input
                      type="file"
                      multiple
                      className="hidden"
                      id="file-upload"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        
                        const newFiles: Array<{file: File, preview: string, type: string}> = [];
                        Array.from(files).forEach(file => {
                          if (file.size > 10 * 1024 * 1024) {
                            toast({
                              title: "Error",
                              description: `File ${file.name} is too large. Maximum size is 10MB`,
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              newFiles.push({ file, preview: reader.result as string, type: 'image' });
                              if (newFiles.length === files.length) {
                                setSelectedFiles(prev => [...prev, ...newFiles]);
                              }
                            };
                            reader.readAsDataURL(file);
                          } else {
                            newFiles.push({ file, preview: file.name, type: file.type.includes('pdf') ? 'pdf' : 'document' });
                            if (newFiles.length === files.length) {
                              setSelectedFiles(prev => [...prev, ...newFiles]);
                            }
                          }
                        });
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      data-testid="button-upload-file"
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    
                    <Textarea
                      value={newMessage}
                      onChange={(e) => handleTypingChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 min-h-[44px] max-h-[120px] resize-none"
                      rows={1}
                      data-testid="textarea-message"
                    />
                    
                    <Button
                      onClick={handleSendMessage}
                      disabled={sendMessageMutation.isPending || (!newMessage.trim() && !selectedImage && selectedFiles.length === 0)}
                      size="icon"
                      className={typedUser.role === 'contractor' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}
                      data-testid="button-send-message"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, User, Calendar, Plus, Users, FileText, DollarSign, Clock, Star, Image as ImageIcon, X, File, Paperclip } from "lucide-react";
import { insertProposalSchema } from "@shared/schema";
import { z } from "zod";
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Array<{file: File, preview: string, type: string}>>([]);
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
  const [isReviewSectionOpen, setIsReviewSectionOpen] = useState(false);
  const [isProposalSectionOpen, setIsProposalSectionOpen] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isProposalDetailOpen, setIsProposalDetailOpen] = useState(false);

  // Proposal form setup (without contractorId/homeownerId as they'll be added on submit)
  const proposalFormSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    scope: z.string().min(1, "Scope of work is required"),
    serviceType: z.string().min(1, "Service type is required"),
    estimatedCost: z.string().min(1, "Estimated cost is required"),
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
    mutationFn: async (messageData: { message: string; imageUrl?: string; attachments?: string[] }) => {
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
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedFiles([]);
    }
  });

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage && selectedFiles.length === 0) || !selectedConversationId) return;

    let imageUrl: string | undefined;
    let attachmentUrls: string[] = [];

    // Upload single image if selected (backward compatibility)
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
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
      const result = reader.result as string;
      setSelectedImage(result);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: Array<{file: File, preview: string, type: string}> = [];
    
    Array.from(files).forEach(file => {
      // Check file size (max 10MB per file)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: `File ${file.name} is too large. Maximum size is 10MB`,
          variant: "destructive",
        });
        return;
      }

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newFiles.push({
            file,
            preview: reader.result as string,
            type: 'image'
          });
          if (newFiles.length === files.length) {
            setSelectedFiles(prev => [...prev, ...newFiles]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // For non-image files, use file type as preview
        newFiles.push({
          file,
          preview: file.name,
          type: file.type.includes('pdf') ? 'pdf' : 'document'
        });
        if (newFiles.length === files.length) {
          setSelectedFiles(prev => [...prev, ...newFiles]);
        }
      }
    });
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
    
    // Transform data to match backend schema (same as proposals component)
    const proposalData = {
      ...data,
      homeownerId: selectedConversation.homeownerId,
      contractorId: typedUser?.id,
      // Always convert materials string to array (handles empty string case)
      materials: (data.materials || "").split(',').map(item => item.trim()).filter(item => item.length > 0),
      estimatedCost: parseFloat(data.estimatedCost).toString(),
      status: "sent" as const,
    };
    
    createProposalMutation.mutate(proposalData);
  };

  // Accept proposal mutation (homeowners only)
  const acceptProposalMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'accepted' })
      });
      if (!response.ok) throw new Error('Failed to accept proposal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      setIsProposalDetailOpen(false);
      setSelectedProposal(null);
      toast({
        title: "Proposal Accepted",
        description: "The contractor has been notified of your acceptance.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept proposal.",
        variant: "destructive",
      });
    }
  });

  // Reject proposal mutation (homeowners only)
  const rejectProposalMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'rejected' })
      });
      if (!response.ok) throw new Error('Failed to reject proposal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      setIsProposalDetailOpen(false);
      setSelectedProposal(null);
      toast({
        title: "Proposal Rejected",
        description: "The contractor has been notified.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject proposal.",
        variant: "destructive",
      });
    }
  });

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
        {/* Conversations List */}
        <Card className="lg:col-span-1 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700" style={{ backgroundColor: '#f2f2f2' }}>
          {typedUser.role === 'homeowner' ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
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
              </CardContent>
            </>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  {conversations.find(c => c.id === selectedConversationId)?.subject || 'Conversation'}
                </CardTitle>
                {/* Create Proposal Button - Contractors only */}
                {typedUser?.role === 'contractor' && selectedConversation && (
                  <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        style={{ backgroundColor: '#1560a2', color: 'white' }}
                        className="hover:opacity-90"
                        data-testid="button-create-proposal-from-message"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Proposal
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#1560a2' }}>
                      <DialogHeader>
                        <DialogTitle style={{ color: 'white' }}>
                          Create Proposal for {selectedConversation?.otherPartyName}
                        </DialogTitle>
                        <DialogDescription style={{ color: '#e0e0e0' }}>
                          Fill out the details below to create a proposal for this homeowner
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...proposalForm}>
                        <form onSubmit={proposalForm.handleSubmit(handleCreateProposal)} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={proposalForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel style={{ color: 'white' }}>Title *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Kitchen renovation proposal"
                                      {...field}
                                      data-testid="input-proposal-title"
                                      style={{ backgroundColor: 'white', color: '#000000' }}
                                    />
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
                                  <FormControl>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                      <SelectTrigger data-testid="select-service-type" style={{ backgroundColor: 'white', color: '#000000' }}>
                                        <SelectValue placeholder="Select service type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="hvac">HVAC</SelectItem>
                                        <SelectItem value="plumbing">Plumbing</SelectItem>
                                        <SelectItem value="electrical">Electrical</SelectItem>
                                        <SelectItem value="roofing">Roofing</SelectItem>
                                        <SelectItem value="gutters">Gutters</SelectItem>
                                        <SelectItem value="drywall">Drywall / Spackling</SelectItem>
                                        <SelectItem value="custom-cabinetry">Custom Cabinetry</SelectItem>
                                        <SelectItem value="flooring">Flooring</SelectItem>
                                        <SelectItem value="painting">Painting</SelectItem>
                                        <SelectItem value="landscaping">Landscaping</SelectItem>
                                        <SelectItem value="christmas-light-hanging">Christmas Light Hanging</SelectItem>
                                        <SelectItem value="snow-removal">Snow Removal</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage style={{ color: '#ffcccc' }} />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={proposalForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel style={{ color: 'white' }}>Description *</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Brief overview of the project"
                                    {...field}
                                    data-testid="textarea-proposal-description"
                                    style={{ backgroundColor: 'white', color: '#000000' }}
                                  />
                                </FormControl>
                                <FormMessage style={{ color: '#ffcccc' }} />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={proposalForm.control}
                            name="scope"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel style={{ color: 'white' }}>Scope of Work *</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Detailed scope of work including specific tasks, materials, and deliverables"
                                    rows={4}
                                    {...field}
                                    data-testid="textarea-proposal-scope"
                                    style={{ backgroundColor: 'white', color: '#000000' }}
                                  />
                                </FormControl>
                                <FormMessage style={{ color: '#ffcccc' }} />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={proposalForm.control}
                              name="estimatedCost"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel style={{ color: 'white' }}>Estimated Cost ($) *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      {...field}
                                      data-testid="input-estimated-cost"
                                      style={{ backgroundColor: 'white', color: '#000000' }}
                                    />
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
                                    <Input
                                      placeholder="2-3 days, 1 week, etc."
                                      {...field}
                                      data-testid="input-estimated-duration"
                                      style={{ backgroundColor: 'white', color: '#000000' }}
                                    />
                                  </FormControl>
                                  <FormMessage style={{ color: '#ffcccc' }} />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={proposalForm.control}
                            name="materials"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel style={{ color: 'white' }}>Materials (comma-separated)</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Pipes, fittings, sealant, labor"
                                    {...field}
                                    data-testid="input-materials"
                                    style={{ backgroundColor: 'white', color: '#000000' }}
                                  />
                                </FormControl>
                                <FormMessage style={{ color: '#ffcccc' }} />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={proposalForm.control}
                              name="warrantyPeriod"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel style={{ color: 'white' }}>Warranty Period</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="1 year, 6 months, etc."
                                      {...field}
                                      value={field.value || ""}
                                      data-testid="input-warranty-period"
                                      style={{ backgroundColor: 'white', color: '#000000' }}
                                    />
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
                                    <Input
                                      type="date"
                                      {...field}
                                      data-testid="input-valid-until"
                                      style={{ backgroundColor: 'white', color: '#000000' }}
                                    />
                                  </FormControl>
                                  <FormMessage style={{ color: '#ffcccc' }} />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={proposalForm.control}
                            name="customerNotes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel style={{ color: 'white' }}>Customer Notes</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Notes visible to the customer about this job"
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="textarea-customer-notes"
                                    style={{ backgroundColor: 'white', color: '#000000' }}
                                  />
                                </FormControl>
                                <FormMessage style={{ color: '#ffcccc' }} />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={proposalForm.control}
                            name="internalNotes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel style={{ color: 'white' }}>Internal Notes</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Private notes for internal use only"
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="textarea-internal-notes"
                                    style={{ backgroundColor: 'white', color: '#000000' }}
                                  />
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
                              style={{ backgroundColor: 'white', color: '#000000' }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={createProposalMutation.isPending}
                              data-testid="button-submit-proposal"
                              style={{ backgroundColor: '#1560a2', color: 'white' }}
                              className="hover:opacity-90"
                            >
                              {createProposalMutation.isPending ? "Creating..." : "Create Proposal"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
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
                                        message.senderId === typedUser.id
                                          ? 'bg-white/20 hover:bg-white/30'
                                          : 'bg-gray-200 hover:bg-gray-300'
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
                  {imagePreview && (
                    <div className="mb-2 relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-w-xs max-h-40 rounded-lg"
                      />
                      <button
                        onClick={handleRemoveImage}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        data-testid="button-remove-image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {selectedFiles.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative">
                          {file.type === 'image' ? (
                            <div className="relative inline-block">
                              <img 
                                src={file.preview} 
                                alt={file.file.name}
                                className="max-w-xs max-h-24 rounded-lg"
                              />
                              <button
                                onClick={() => handleRemoveFile(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg pr-8 relative">
                              {file.type === 'pdf' ? <FileText className="h-4 w-4" /> : <File className="h-4 w-4" />}
                              <span className="text-sm truncate max-w-[150px]">{file.file.name}</span>
                              <button
                                onClick={() => handleRemoveFile(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="message-image-input"
                    />
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="message-files-input"
                    />
                    <Button
                      type="button"
                      onClick={() => document.getElementById('message-image-input')?.click()}
                      className="self-end"
                      style={{ backgroundColor: '#1560a2', color: 'white' }}
                      data-testid="button-upload-image"
                      title="Upload image"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      onClick={() => document.getElementById('message-files-input')?.click()}
                      className="self-end"
                      style={{ backgroundColor: '#1560a2', color: 'white' }}
                      data-testid="button-upload-files"
                      title="Attach files (images, PDFs, documents)"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
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
                      disabled={(!newMessage.trim() && !selectedImage && selectedFiles.length === 0) || sendMessageMutation.isPending}
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

                {/* Proposals Section - Only for homeowners viewing contractor conversations */}
                {typedUser?.role === 'homeowner' && contractorIdForReview && (
                  <div className="p-4 border-t bg-white" data-testid="section-proposals">
                    {!isProposalSectionOpen ? (
                      <Button
                        onClick={() => setIsProposalSectionOpen(true)}
                        className="w-full"
                        style={{ backgroundColor: '#b6a6f4', color: 'white' }}
                        data-testid="button-open-proposals"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Proposals ({proposals.filter(p => p.contractorId === contractorIdForReview).length})
                      </Button>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                            <FileText className="h-5 w-5" style={{ color: '#b6a6f4' }} />
                            Proposals from {selectedConversation?.otherPartyName}
                          </h3>
                          <Button
                            onClick={() => setIsProposalSectionOpen(false)}
                            variant="ghost"
                            size="sm"
                            data-testid="button-close-proposals"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {proposalsLoading ? (
                          <div className="text-center text-gray-500 py-4">Loading proposals...</div>
                        ) : proposals.filter(p => p.contractorId === contractorIdForReview).length === 0 ? (
                          <div className="text-center text-gray-500 py-4 bg-gray-50 rounded-lg">
                            No proposals yet from this contractor.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {proposals
                              .filter(p => p.contractorId === contractorIdForReview)
                              .map((proposal) => (
                                <div 
                                  key={proposal.id} 
                                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={() => {
                                    setSelectedProposal(proposal);
                                    setIsProposalDetailOpen(true);
                                  }}
                                  data-testid={`proposal-item-${proposal.id}`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-medium text-gray-900">{proposal.title}</h4>
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
                                  <p className="text-sm text-gray-600 line-clamp-1">{proposal.description}</p>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      <span>${parseFloat(proposal.estimatedCost).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{proposal.estimatedDuration}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Review Section - Only for homeowners viewing contractor conversations after messages exchanged */}
                {typedUser?.role === 'homeowner' && contractorIdForReview && messages.length > 0 && (
                  <div className="p-4 border-t bg-white" data-testid="section-review">
                    {!isReviewSectionOpen ? (
                      <Button
                        onClick={() => setIsReviewSectionOpen(true)}
                        className="w-full"
                        style={{ backgroundColor: '#b6a6f4', color: 'white' }}
                        data-testid="button-open-review"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        {existingReview ? 'View Your Review' : 'Leave a Review'}
                      </Button>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                            <Star className="h-5 w-5" style={{ color: '#b6a6f4' }} />
                            {existingReview ? 'Your Review' : 'Leave a Review'}
                          </h3>
                          <Button
                            onClick={() => setIsReviewSectionOpen(false)}
                            variant="ghost"
                            size="sm"
                            data-testid="button-close-review"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
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

      {/* Proposal Detail Dialog (Homeowners only) */}
      <Dialog open={isProposalDetailOpen} onOpenChange={setIsProposalDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto [&>button]:text-white">
          <DialogHeader>
            <DialogTitle className="text-purple-400">Proposal Details</DialogTitle>
            <DialogDescription>
              Review the full proposal from the contractor
            </DialogDescription>
          </DialogHeader>
          
          {selectedProposal && (
            <div className="space-y-4 mt-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <Badge variant={
                  selectedProposal.status === 'sent' ? 'default' :
                  selectedProposal.status === 'accepted' ? 'default' :
                  selectedProposal.status === 'rejected' ? 'destructive' :
                  'secondary'
                } style={
                  selectedProposal.status === 'accepted' ? { backgroundColor: '#10b981', color: 'white' } : {}
                }>
                  {selectedProposal.status}
                </Badge>
                <span className="text-sm text-red-500">
                  Valid until: {new Date(selectedProposal.validUntil).toLocaleDateString()}
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-purple-400">{selectedProposal.title}</h3>
                <p className="text-white">{selectedProposal.description}</p>
              </div>

              {/* Key Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm text-gray-600">Service Type</Label>
                  <p className="font-medium">{selectedProposal.serviceType}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Estimated Cost</Label>
                  <p className="font-medium text-lg">${parseFloat(selectedProposal.estimatedCost).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Estimated Duration</Label>
                  <p className="font-medium">{selectedProposal.estimatedDuration}</p>
                </div>
                {selectedProposal.warrantyPeriod && (
                  <div>
                    <Label className="text-sm text-gray-600">Warranty Period</Label>
                    <p className="font-medium">{selectedProposal.warrantyPeriod}</p>
                  </div>
                )}
              </div>

              {/* Scope of Work */}
              <div>
                <Label className="font-semibold mb-2 block text-white">Scope of Work</Label>
                <div className="p-4 bg-white border rounded-lg">
                  <p className="whitespace-pre-wrap text-gray-700">{selectedProposal.scope}</p>
                </div>
              </div>

              {/* Materials */}
              {selectedProposal.materials && selectedProposal.materials.length > 0 && (
                <div>
                  <Label className="font-semibold mb-2 block">Materials</Label>
                  <ul className="list-disc list-inside space-y-1 p-4 bg-white border rounded-lg">
                    {selectedProposal.materials.map((material, index) => (
                      <li key={index} className="text-gray-700">{material}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Customer Notes */}
              {selectedProposal.customerNotes && (
                <div>
                  <Label className="font-semibold mb-2 block">Notes for You</Label>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="whitespace-pre-wrap text-gray-700">{selectedProposal.customerNotes}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedProposal.status === 'sent' && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => acceptProposalMutation.mutate(selectedProposal.id)}
                    disabled={acceptProposalMutation.isPending || rejectProposalMutation.isPending}
                    className="flex-1"
                    style={{ backgroundColor: '#10b981', color: 'white' }}
                    data-testid="button-accept-proposal"
                  >
                    {acceptProposalMutation.isPending ? 'Accepting...' : 'Accept Proposal'}
                  </Button>
                  <Button
                    onClick={() => rejectProposalMutation.mutate(selectedProposal.id)}
                    disabled={acceptProposalMutation.isPending || rejectProposalMutation.isPending}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-reject-proposal"
                  >
                    {rejectProposalMutation.isPending ? 'Rejecting...' : 'Reject Proposal'}
                  </Button>
                </div>
              )}

              {selectedProposal.status === 'accepted' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-green-800 font-medium">✓ You accepted this proposal</p>
                </div>
              )}

              {selectedProposal.status === 'rejected' && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <p className="text-gray-600">You rejected this proposal</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
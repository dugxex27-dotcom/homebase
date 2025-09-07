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
import { MessageCircle, Send, User, Calendar, Plus, Users } from "lucide-react";
import type { User as UserType, Conversation, Message, Contractor } from "@shared/schema";

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

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/conversations', selectedConversationId, 'messages'],
    enabled: !!selectedConversationId
  });

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
      <div className="min-h-screen bg-purple-50 dark:bg-gray-900">
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
    : 'bg-purple-50 dark:bg-gray-900';
  
  const heroGradient = typedUser.role === 'contractor'
    ? ''
    : 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 dark:from-purple-950/20 dark:via-purple-900/20 dark:to-purple-950/20';
  
  const accentColor = typedUser.role === 'contractor'
    ? 'text-blue-800 dark:text-blue-400'
    : 'text-purple-600 dark:text-purple-400';

  return (
    <div className={`min-h-screen ${bgColor}`} style={typedUser.role === 'contractor' ? { backgroundColor: '#1560a2' } : {}}>
      <Header />
      
      {/* Hero Section */}
      <section className={`${heroGradient} py-16`} style={typedUser.role === 'contractor' ? { backgroundColor: '#1560a2' } : {}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6" style={typedUser.role === 'contractor' ? { color: 'white' } : { color: 'text-gray-900 dark:text-white' }}>
              <span className={typedUser.role === 'contractor' ? '' : accentColor} style={typedUser.role === 'contractor' ? { color: 'white' } : {}}>Messages</span>
            </h1>
            <p className="text-xl max-w-3xl mx-auto mb-8" style={typedUser.role === 'contractor' ? { color: '#afd6f9' } : { color: 'text-gray-600 dark:text-gray-300' }}>
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
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Conversations
              </div>
              {typedUser?.role === 'homeowner' && (
                <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-compose-message" style={{ backgroundColor: '#1560a2', color: 'white' }} className="hover:opacity-90">
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" style={{ backgroundColor: '#f2f2f2' }}>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2" style={{ color: '#1560a2' }}>
                        <Users className="h-5 w-5" style={{ color: '#1560a2' }} />
                        Send Message to Contractors
                      </DialogTitle>
                      <DialogDescription>
                        Select one or more contractors to send your message to. Each contractor will receive a separate conversation.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="subject" style={{ color: '#1560a2' }}>Subject</Label>
                        <Input
                          id="subject"
                          data-testid="input-subject"
                          placeholder="Enter message subject"
                          value={composeForm.subject}
                          onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                          style={{ backgroundColor: '#ffffff' }}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="message" style={{ color: '#1560a2' }}>Message</Label>
                        <Textarea
                          id="message"
                          data-testid="textarea-message"
                          placeholder="Write your message..."
                          value={composeForm.message}
                          onChange={(e) => setComposeForm(prev => ({ ...prev, message: e.target.value }))}
                          rows={4}
                          style={{ backgroundColor: '#ffffff' }}
                        />
                      </div>
                      
                      <div>
                        <Label style={{ color: '#1560a2' }}>Select Contractors ({composeForm.selectedContractors.length} selected)</Label>
                        <ScrollArea className="h-60 border rounded-md p-4 mt-2">
                          <div className="space-y-3">
                            {contractors.map((contractor) => (
                              <div key={contractor.id} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`contractor-${contractor.id}`}
                                  data-testid={`checkbox-contractor-${contractor.id}`}
                                  checked={composeForm.selectedContractors.includes(contractor.id)}
                                  onCheckedChange={(checked) => handleContractorSelection(contractor.id, checked as boolean)}
                                />
                                <Label htmlFor={`contractor-${contractor.id}`} className="flex-1 cursor-pointer">
                                  <div>
                                    <div className="font-medium">{contractor.name} - {contractor.company}</div>
                                    <div className="text-sm text-gray-500">
                                      {contractor.services.slice(0, 3).join(', ')}
                                      {contractor.services.length > 3 && ` +${contractor.services.length - 3} more`}
                                    </div>
                                    <div className="text-sm text-gray-500">{contractor.location}</div>
                                  </div>
                                </Label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsComposeDialogOpen(false)}
                          data-testid="button-cancel-compose"
                          style={{ backgroundColor: '#3798ef', color: 'white' }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleComposeSubmit}
                          disabled={sendBulkMessageMutation.isPending || composeForm.selectedContractors.length === 0}
                          data-testid="button-send-bulk-message"
                          style={{ backgroundColor: '#1560a2', color: 'white' }}
                          className="hover:opacity-90"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {sendBulkMessageMutation.isPending ? 'Sending...' : `Send to ${composeForm.selectedContractors.length} Contractor${composeForm.selectedContractors.length !== 1 ? 's' : ''}`}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {conversationsLoading ? (
                <div className="p-4 text-center text-gray-500">Loading conversations...</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No conversations yet. Contact a {typedUser.role === 'homeowner' ? 'contractor' : 'homeowner'} to start messaging.
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div key={conversation.id}>
                    <div
                      className={`p-4 cursor-pointer hover:bg-gray-50 ${
                        selectedConversationId === conversation.id 
                          ? typedUser.role === 'contractor' 
                            ? 'bg-blue-50 border-r-2 border-blue-800' 
                            : 'bg-blue-50 border-r-2 border-blue-500'
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
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
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
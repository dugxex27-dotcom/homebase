import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, User, Calendar } from "lucide-react";
import type { User as UserType, Conversation, Message } from "@shared/schema";

interface ConversationWithDetails extends Conversation {
  otherPartyName: string;
  unreadCount: number;
}

export default function Messages() {
  const { user } = useAuth();
  const typedUser = user as UserType | undefined;
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<ConversationWithDetails[]>({
    queryKey: ['/api/conversations'],
    enabled: !!typedUser
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

  if (!typedUser) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-6">
          <Card>
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-2">
          {typedUser.role === 'homeowner' 
            ? 'Communicate with contractors about your projects'
            : 'Stay in touch with your homeowner clients'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversations
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
                        selectedConversationId === conversation.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
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
        <Card className="lg:col-span-2">
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
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.message}</p>
                            <p className={`text-xs mt-1 ${
                              message.senderId === typedUser.id ? 'text-blue-100' : 'text-gray-500'
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
                      className="self-end"
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
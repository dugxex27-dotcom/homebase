import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send } from "lucide-react";
import { useLocation } from "wouter";
import type { User, Contractor } from "@shared/schema";
import { trackContactClick } from "@/lib/analytics";

interface ContactContractorButtonProps {
  contractor: Contractor;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export default function ContactContractorButton({ 
  contractor, 
  variant = "default", 
  size = "default",
  className = ""
}: ContactContractorButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const typedUser = user as User | undefined;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (data: { homeownerId: string; contractorId: string; subject: string }) => {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create conversation');
      return response.json();
    },
    onSuccess: async (conversation) => {
      // Send the initial message
      const messageResponse = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message })
      });
      if (!messageResponse.ok) throw new Error('Failed to send message');
      
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setIsOpen(false);
      setSubject("");
      setMessage("");
      
      toast({
        title: "Message Sent",
        description: `Your message has been sent to ${contractor.name}.`,
      });
      
      // Redirect to messages page
      setLocation('/messages');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both subject and message fields.",
        variant: "destructive",
      });
      return;
    }

    if (!typedUser) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to contact contractors.",
        variant: "destructive",
      });
      return;
    }

    createConversationMutation.mutate({
      homeownerId: typedUser.id,
      contractorId: contractor.id,
      subject: subject.trim()
    });
  };

  // Don't show button for contractors
  if (!isAuthenticated || typedUser?.role !== 'homeowner') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={`${variant === "default" ? "text-white hover:opacity-90" : variant === "outline" ? "border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-900/20" : ""} ${className}`}
          style={variant === "default" ? { backgroundColor: '#3c258e' } : {}}
          onClick={() => trackContactClick(contractor.id, 'message')}
          data-testid="button-contact-contractor"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" style={{ backgroundColor: '#f2f2f2' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#2c0f5b' }}>Contact {contractor.name}</DialogTitle>
          <DialogDescription style={{ color: '#666666' }}>
            Send a message to {contractor.name} from {contractor.company} to discuss your project needs.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject" style={{ color: '#2c0f5b' }}>Subject</Label>
            <Input
              id="subject"
              placeholder="What would you like to discuss?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ color: '#2c0f5b', backgroundColor: 'white' }}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message" style={{ color: '#2c0f5b' }}>Message</Label>
            <Textarea
              id="message"
              placeholder="Describe your project needs, timeline, budget, or any questions you have..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              style={{ color: '#2c0f5b', backgroundColor: 'white' }}
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={createConversationMutation.isPending}
            style={{ color: '#2c0f5b', borderColor: '#2c0f5b' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSendMessage}
            disabled={createConversationMutation.isPending}
          >
            {createConversationMutation.isPending ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
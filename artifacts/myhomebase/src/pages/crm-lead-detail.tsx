import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Plus, Pin } from "lucide-react";
import { format } from "date-fns";

interface CrmLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  source: string;
  status: string;
  priority: string;
  projectType: string | null;
  estimatedValue: string | null;
  followUpDate: string | null;
  lastContactedAt: string | null;
  createdAt: string;
}

interface CrmNote {
  id: string;
  leadId: string;
  userId: string;
  content: string;
  noteType: string;
  isPinned: boolean;
  createdAt: string;
}

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
  not_interested: "Not Interested"
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent"
};

const noteTypeLabels: Record<string, string> = {
  general: "General",
  call: "Call",
  meeting: "Meeting",
  email: "Email",
  follow_up: "Follow-up"
};

export default function CrmLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState("general");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  // Fetch lead with notes
  const { data, isLoading } = useQuery<{ lead: CrmLead; notes: CrmNote[] }>({
    queryKey: [`/api/crm/leads/${id}`],
    enabled: !!id,
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async (updateData: any) => {
      return await apiRequest(`/api/crm/leads/${id}`, 'PATCH', updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/leads/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      toast({
        title: "Lead updated",
        description: "Lead has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead",
        variant: "destructive",
      });
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (noteData: { content: string; noteType: string }) => {
      return await apiRequest(`/api/crm/leads/${id}/notes`, 'POST', noteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/leads/${id}`] });
      setNewNoteContent("");
      setNewNoteType("general");
      toast({
        title: "Note added",
        description: "Note has been added to the lead.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = () => {
    if (selectedStatus && selectedStatus !== data?.lead.status) {
      updateLeadMutation.mutate({ status: selectedStatus });
    }
  };

  const handleUpdatePriority = () => {
    if (selectedPriority && selectedPriority !== data?.lead.priority) {
      updateLeadMutation.mutate({ priority: selectedPriority });
    }
  };

  const handleUpdateFollowUp = () => {
    if (followUpDate) {
      updateLeadMutation.mutate({ followUpDate: new Date(followUpDate).toISOString() });
    }
  };

  const handleAddNote = () => {
    if (!newNoteContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter a note",
        variant: "destructive",
      });
      return;
    }
    addNoteMutation.mutate({ content: newNoteContent, noteType: newNoteType });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading lead...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Lead not found</p>
            <Button onClick={() => navigate('/crm')} data-testid="button-back-to-crm">
              Back to CRM
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { lead, notes } = data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/crm')}
        className="mb-4"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Leads
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Information - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl" data-testid="lead-name">
                {lead.firstName} {lead.lastName}
              </CardTitle>
              <CardDescription>
                {lead.projectType && <span>{lead.projectType}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm hover:underline" data-testid="link-phone">
                    <Phone className="h-4 w-4" />
                    {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm hover:underline" data-testid="link-email">
                    <Mail className="h-4 w-4" />
                    {lead.email}
                  </a>
                )}
              </div>

              {(lead.address || lead.city || lead.state) && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <span>
                    {lead.address && <span>{lead.address}<br /></span>}
                    {(lead.city || lead.state || lead.postalCode) && (
                      <span>{lead.city}{lead.state && `, ${lead.state}`} {lead.postalCode}</span>
                    )}
                  </span>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Source:</span>
                  <span className="ml-2 font-medium">{lead.source}</span>
                </div>
                {lead.estimatedValue && (
                  <div>
                    <span className="text-muted-foreground">Est. Value:</span>
                    <span className="ml-2 font-medium">${lead.estimatedValue}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <span className="ml-2">{format(new Date(lead.createdAt), 'MMM d, yyyy')}</span>
                </div>
                {lead.lastContactedAt && (
                  <div>
                    <span className="text-muted-foreground">Last Contact:</span>
                    <span className="ml-2">{format(new Date(lead.lastContactedAt), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>Notes & Activity</CardTitle>
              <CardDescription>Track conversations and follow-ups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note Form */}
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div className="flex gap-2">
                  <Select value={newNoteType} onValueChange={setNewNoteType}>
                    <SelectTrigger className="w-40" data-testid="select-note-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(noteTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Add a note..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="textarea-note"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={addNoteMutation.isPending}
                  size="sm"
                  data-testid="button-add-note"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                </Button>
              </div>

              <Separator />

              {/* Notes List */}
              <div className="space-y-3">
                {notes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No notes yet</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="p-4 border rounded-lg" data-testid={`note-${note.id}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{noteTypeLabels[note.noteType]}</Badge>
                          {note.isPinned && <Pin className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap" data-testid={`note-content-${note.id}`}>{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Panel - Right Column */}
        <div className="space-y-6">
          {/* Status Update */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge data-testid="current-status">{statusLabels[lead.status]}</Badge>
              <Select value={selectedStatus || lead.status} onValueChange={setSelectedStatus}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleUpdateStatus}
                disabled={!selectedStatus || selectedStatus === lead.status || updateLeadMutation.isPending}
                className="w-full"
                size="sm"
                data-testid="button-update-status"
              >
                Update Status
              </Button>
            </CardContent>
          </Card>

          {/* Priority Update */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Priority</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge data-testid="current-priority">{priorityLabels[lead.priority]}</Badge>
              <Select value={selectedPriority || lead.priority} onValueChange={setSelectedPriority}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleUpdatePriority}
                disabled={!selectedPriority || selectedPriority === lead.priority || updateLeadMutation.isPending}
                className="w-full"
                size="sm"
                data-testid="button-update-priority"
              >
                Update Priority
              </Button>
            </CardContent>
          </Card>

          {/* Follow-up Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Follow-up
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.followUpDate && (
                <p className="text-sm text-muted-foreground">
                  Current: {format(new Date(lead.followUpDate), 'MMM d, yyyy')}
                </p>
              )}
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                data-testid="input-follow-up-date"
              />
              <Button
                onClick={handleUpdateFollowUp}
                disabled={!followUpDate || updateLeadMutation.isPending}
                className="w-full"
                size="sm"
                data-testid="button-update-follow-up"
              >
                Set Follow-up Date
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

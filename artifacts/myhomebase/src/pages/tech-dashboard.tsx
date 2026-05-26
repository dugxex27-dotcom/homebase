import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Clock,
  DollarSign,
  AlertCircle,
  PauseCircle,
  Plus,
} from "lucide-react";
import { format } from "date-fns";

interface TechInvoice {
  id: string;
  fileName: string;
  fileUrl: string;
  description: string | null;
  amount: string | null;
  invoiceDate: string | null;
  createdAt: string | null;
  uploaderFirstName: string | null;
  uploaderLastName: string | null;
}

interface TechDashboardProps {
  user: {
    firstName?: string | null;
    email?: string | null;
    companyStatus?: string | null;
  };
}

export function TechDashboard({ user }: TechDashboardProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: invoices = [], isLoading } = useQuery<TechInvoice[]>({
    queryKey: ["/api/contractor/enterprise/invoices"],
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (description) fd.append("description", description);
      if (amount) fd.append("amount", amount);
      if (invoiceDate) fd.append("invoiceDate", invoiceDate);

      const res = await fetch("/api/contractor/enterprise/invoices/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Upload failed");
      }
      await qc.invalidateQueries({ queryKey: ["/api/contractor/enterprise/invoices"] });
      toast({ title: "Invoice uploaded", description: `${file.name} uploaded successfully.` });
      setUploadOpen(false);
      setFile(null);
      setDescription("");
      setAmount("");
      setInvoiceDate("");
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const isSuspended = user.companyStatus === "suspended";
  const firstName = user.firstName || user.email?.split("@")[0] || "Tech";

  if (isSuspended) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "#FEF2F2" }}
          >
            <PauseCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Account Suspended</h2>
          <p className="text-slate-600">
            Your company account has been suspended. Please contact your company administrator to
            restore access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        className="dash-header"
        style={{ background: "linear-gradient(135deg, #0C3460 0%, #1560A2 100%)" }}
      >
        <span className="dash-eyebrow" style={{ color: "#AFD6F9" }}>FIELD TECHNICIAN</span>
        <div className="dash-title">Welcome back, {firstName}</div>
        <div className="dash-subtitle">Upload your work invoices and track your submissions</div>
        <div className="dash-chips">
          <div className="dash-chip">
            <div className="dash-chip-num good">{invoices.length}</div>
            <div className="dash-chip-label">Invoices</div>
          </div>
          <div className="dash-chip">
            <div className="dash-chip-num good">
              {invoices.filter((i) => i.amount).length}
            </div>
            <div className="dash-chip-label">With Amount</div>
          </div>
        </div>
      </div>

      <div className="dash-body">
        {/* Upload Action */}
        <span className="dash-section-label">Quick Actions</span>
        <button
          className="action-row"
          style={{
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            background: "white",
            fontFamily: "inherit",
          }}
          onClick={() => setUploadOpen(true)}
        >
          <div className="action-icon" style={{ background: "#EAF4FD", color: "#1560A2" }}>
            <Upload size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="action-title">Upload Invoice</div>
            <div className="action-sub">Submit proof-of-work for a completed job</div>
          </div>
          <span className="action-cta" style={{ color: "#1560A2" }}>
            Upload →
          </span>
        </button>

        {/* Invoice List */}
        <span className="dash-section-label" style={{ marginTop: 24 }}>
          My Invoices
        </span>

        {isLoading ? (
          <div className="text-slate-400 text-center py-8">Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium mb-1">No invoices yet</p>
              <p className="text-slate-400 text-sm mb-4">
                Upload your first invoice to get started.
              </p>
              <Button
                variant="outline"
                onClick={() => setUploadOpen(true)}
                className="gap-2"
              >
                <Plus size={15} />
                Upload Invoice
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-white rounded-xl border border-slate-100 p-4 flex items-start gap-3"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "#EAF4FD" }}
                >
                  <FileText size={18} className="text-[#1560A2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{inv.fileName}</p>
                  {inv.description && (
                    <p className="text-sm text-slate-500 truncate">{inv.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {inv.amount && (
                      <span className="text-xs text-green-700 flex items-center gap-1">
                        <DollarSign size={11} />
                        {parseFloat(inv.amount).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    )}
                    {inv.invoiceDate && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={11} />
                        {inv.invoiceDate}
                      </span>
                    )}
                    {inv.createdAt && (
                      <span className="text-xs text-slate-400">
                        Uploaded {format(new Date(inv.createdAt), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href={inv.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#1560A2] hover:underline shrink-0"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="flex flex-col gap-4 py-1">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Invoice File <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#EAF4FD] file:text-[#1560A2] hover:file:bg-[#dbeeff]"
                required
              />
              <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG or JPEG — max 10 MB</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. HVAC repair at 123 Main St"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Invoice Date
                </label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading || !file}
                style={{ background: "#1560A2" }}
                className="text-white"
              >
                {uploading ? "Uploading…" : "Upload Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

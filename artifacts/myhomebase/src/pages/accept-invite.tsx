import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

interface CompanyInfo {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  companyName: string;
  expiresAt: string | null;
}

type PageStatus = "loading" | "invalid" | "ready" | "submitting" | "success";

export default function AcceptInvite() {
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token");

  const [status, setStatus] = useState<PageStatus>("loading");
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setError("No invite token found in this link. Please check your invitation email.");
      return;
    }
    fetch(`/api/contractor/enterprise/validate-token?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.message && !data.companyName) {
          setStatus("invalid");
          setError(data.message);
        } else {
          setCompanyInfo(data);
          setForm((f) => ({
            ...f,
            firstName: data.firstName || "",
            lastName: data.lastName || "",
          }));
          setStatus("ready");
        }
      })
      .catch(() => {
        setStatus("invalid");
        setError("Failed to validate invitation. Please try again or contact your manager.");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/contractor/enterprise/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("ready");
        setError(data.message || "Failed to accept invite. Please try again.");
        return;
      }
      setStatus("success");
      setTimeout(() => navigate("/contractor-dashboard"), 1500);
    } catch {
      setStatus("ready");
      setError("Network error. Please check your connection and try again.");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1560A2]" />
          <p className="text-slate-600">Validating your invitation…</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Invitation</h2>
              <p className="text-slate-600">{error}</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/")}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Account Activated!</h2>
              <p className="text-slate-600">
                Welcome to {companyInfo?.companyName}. Redirecting to your dashboard…
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
            style={{ background: "linear-gradient(135deg, #0C3460, #1560A2)" }}
          >
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Team Invitation</h1>
          <p className="text-slate-500 mt-1">
            You've been invited to join{" "}
            <strong className="text-[#1560A2]">{companyInfo?.companyName}</strong> on MyHomeBase™
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Set up your account</CardTitle>
            <CardDescription>
              {companyInfo?.email && (
                <span>
                  Signing in as <strong>{companyInfo.email}</strong>
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name
                  </label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="Jane"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name
                  </label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Smith"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="At least 8 characters"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, confirmPassword: e.target.value }))
                    }
                    placeholder="Repeat password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 flex items-start gap-1.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={status === "submitting"}
                style={{ background: "#1560A2" }}
                className="w-full text-white mt-1"
              >
                {status === "submitting" ? (
                  <><Loader2 size={16} className="animate-spin mr-2" /> Activating…</>
                ) : (
                  "Activate Account & Join Team"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-4">
          By accepting, you agree to MyHomeBase™'s{" "}
          <a href="/terms-of-service" className="underline">Terms of Service</a>.
        </p>
      </div>
    </div>
  );
}

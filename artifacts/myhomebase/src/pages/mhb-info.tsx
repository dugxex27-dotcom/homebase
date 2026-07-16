import { Info, Shield, Star, Users, Wrench, FileText, HelpCircle, Mail, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import "./home.css";

const FEATURES = [
  { icon: Wrench, title: "Maintenance Scheduling", desc: "AI-powered maintenance schedules tailored to your home's age, systems, and local climate." },
  { icon: FileText, title: "Document Vault", desc: "Store warranties, permits, inspection reports, and receipts — all in one secure place." },
  { icon: Star, title: "Home Health Score", desc: "Get a real score on your home's maintenance posture and actionable steps to improve it." },
  { icon: Shield, title: "Insurance Readiness", desc: "Stay prepared for claims with organized records, photos, and a claim-ready home package." },
  { icon: Users, title: "Contractor Directory", desc: "Find and message vetted local contractors directly through the platform." },
  { icon: FileText, title: "Resale & Disclosure", desc: "Generate disclosure-ready maintenance histories and handoff packages when you sell." },
];

const LINKS = [
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Legal Disclaimer", href: "/legal-disclaimer" },
  { label: "FAQ", href: "/faq" },
  { label: "Support", href: "/support" },
];

export default function MhbInfo() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-8">

        <div className="text-center space-y-3">
          <Badge
            className="text-white text-xs px-3 py-1"
            style={{ background: "linear-gradient(135deg, var(--theme-gradient-start) 0%, var(--theme-gradient-end) 100%)" }}
          >
            MyHomeBase™
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: "var(--purple-deep)" }}>
            About MyHomeBase™
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            The smart home management platform built for homeowners who want to protect their biggest investment.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg" style={{ color: "var(--purple-deep)" }}>
              <Info className="h-5 w-5" />
              What MyHomeBase Does
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3">
                  <div
                    className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--purple-light, #EEEDFE)" }}
                  >
                    <Icon className="h-4 w-4" style={{ color: "var(--purple-deep)" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg" style={{ color: "var(--purple-deep)" }}>
              <HelpCircle className="h-5 w-5" />
              Help & Legal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="flex items-center gap-2 text-sm text-[#3C258E] hover:underline font-medium">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg" style={{ color: "var(--purple-deep)" }}>
              <Mail className="h-5 w-5" />
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>
              Email:{" "}
              <a href="mailto:support@gotohomebase.com" className="text-[#3C258E] hover:underline font-medium">
                support@gotohomebase.com
              </a>
            </p>
            <p>
              Website:{" "}
              <a
                href="https://gotohomebase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#3C258E] hover:underline font-medium inline-flex items-center gap-1"
              >
                gotohomebase.com <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 pb-4">
          © {new Date().getFullYear()} MyHomeBase™. All rights reserved.
        </p>
      </main>
    </div>
  );
}

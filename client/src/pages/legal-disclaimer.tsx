import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function LegalDisclaimer() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center gap-3 mb-2">
              <AlertTriangle className="w-8 h-8 text-purple-600" />
              <CardTitle className="text-3xl font-bold">Legal Disclaimer</CardTitle>
            </div>
            <p className="text-sm text-gray-500">Last Updated: November 15, 2025</p>
          </CardHeader>
          
          <CardContent className="prose prose-sm max-w-none mt-6 space-y-6">
            <div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                The following legal notices apply to all users of the My HomeBase App ("the App," "we," "us," or "our"). By using My HomeBase, you agree to the terms outlined below.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Marketplace Disclaimer</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                My HomeBase is a software platform and marketplace that connects homeowners with independent contractors.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2 font-medium">
                We do not:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Guarantee the quality, safety, or performance of any contractor's work</li>
                <li>Verify every contractor's qualifications, licensing, or insurance status</li>
                <li>Oversee or supervise contractor activities</li>
                <li>Participate in contractor–homeowner agreements, negotiations, or payments outside the App</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                Homeowners are solely responsible for performing due diligence before hiring a contractor, including checking references, licenses, insurance, and performing any necessary verification.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                My HomeBase is not a contractor, broker, or home services provider.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. No Warranty or Guarantee</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                My HomeBase provides its platform "as is" and makes no warranties, express or implied, regarding:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>The accuracy of suggestions or information provided</li>
                <li>Contractor reliability or workmanship</li>
                <li>The availability or performance of the App</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                Any home repair, maintenance, or improvement work is performed at your own risk.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. Home Maintenance Guidance Disclaimer</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                The My HomeBase home maintenance schedule, reminders, and AI-generated suggestions are guidelines only.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2 font-medium">
                They are:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Not comprehensive</li>
                <li>Not a substitute for professional inspection</li>
                <li>Not guaranteed to prevent damage, hazards, or failures in your home</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                If you have any concerns, uncertainties, or questions, you should consult with a licensed professional.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                My HomeBase is not liable for damages resulting from reliance on maintenance suggestions or AI-generated advice.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. User Responsibility</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                You agree that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>You are responsible for your decisions when selecting and hiring contractors</li>
                <li>You will use the platform in compliance with all local laws and regulations</li>
                <li>You will not misuse or rely on My HomeBase as a replacement for professional advice</li>
                <li>You assume all risks associated with home improvement, maintenance, and contractor engagement</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Limitation of Liability</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                To the fullest extent permitted by law, My HomeBase is not responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Injuries, damages, or losses arising from contractor services</li>
                <li>Financial losses from contractor work</li>
                <li>Property damage caused by contractors or home conditions</li>
                <li>Errors, omissions, or inaccuracies in guidance provided by the App or its AI</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                Your sole remedy for dissatisfaction with the platform is discontinuing use of the App.
              </p>
            </div>

            <div className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Contact</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                If you have questions about this legal section or need further clarification, please visit our <Link href="/support" className="text-purple-600 hover:text-purple-700 underline font-medium">Support Center</Link>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

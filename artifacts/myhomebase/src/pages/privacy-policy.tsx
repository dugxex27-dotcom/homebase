import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Shield className="w-8 h-8" style={{ color: 'var(--purple)' }} />
              <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
            </div>
            <p className="text-sm text-gray-500">Last Updated: November 15, 2025</p>
          </CardHeader>
          
          <CardContent className="prose prose-sm max-w-none mt-6 space-y-6">
            <div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                MyHomeBase™ ("HomeBase," "we," "our," or "us") is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the MyHomeBase™ mobile application, website, or related services (the "Service").
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                By using MyHomeBase™, you agree to the practices described in this Privacy Policy.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Information We Collect</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                We may collect the following types of information when you use MyHomeBase™:
              </p>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">1.1 Account Information</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Name</li>
                <li>Email address</li>
                <li>Password (encrypted)</li>
                <li>Referral information</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">1.2 Home Information</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Home address</li>
                <li>Home details such as size, age, number of rooms, and features</li>
                <li>Maintenance tasks you create or complete</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">1.3 Contractor Information</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">(For contractor accounts)</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Business name</li>
                <li>License details</li>
                <li>Insurance documents</li>
                <li>Location and service area</li>
                <li>Business description and specialties</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">1.4 Usage Information</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>App interactions</li>
                <li>Features used</li>
                <li>Completed tasks</li>
                <li>Clicks, screens visited, and action logs (for improving performance)</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">1.5 Device Information</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Device model</li>
                <li>Operating system</li>
                <li>App version</li>
                <li>IP address</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. How We Use Your Information</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">We use your information only for internal purposes, including:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Providing and improving the Service</li>
                <li>Operating features such as task tracking, reminders, and contractor messaging</li>
                <li>Suggesting maintenance tasks or contractors</li>
                <li>Preventing fraud and abuse</li>
                <li>Monitoring app health and performance</li>
                <li>Communicating with you about updates, reminders, or support</li>
                <li>Analyzing usage trends to improve user experience</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                We do not sell your personal information — ever.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                We do not share personal information with third parties for marketing purposes.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. How We Share Information</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                We may share information only in limited situations:
              </p>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">3.1 With Contractors</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">If you contact a contractor through MyHomeBase™, we may share:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Your name</li>
                <li>Your home location (general area, not full address unless you provide it)</li>
                <li>Details about the task or issue</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">3.2 With Service Providers</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">Only when necessary for:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Hosting</li>
                <li>Data storage</li>
                <li>App analytics</li>
                <li>Technical support</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                These vendors are required to protect your data and cannot use it for their own purposes.
              </p>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">3.3 Legal Requirements</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">We may disclose information if required to:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-2">
                <li>Comply with a lawful request</li>
                <li>Respond to a subpoena</li>
                <li>Protect the rights, property, or safety of MyHomeBase™ or users</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We never voluntarily share data with law enforcement without proper legal process.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Data Retention</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">We retain data only as long as it is necessary to:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Provide the Service</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes</li>
                <li>Enforce our agreements</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                You may request data deletion at any time (see Section 9).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Data Security</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                We use industry-standard safeguards to protect your information, including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Encrypted passwords</li>
                <li>Secure data transmission (HTTPS)</li>
                <li>Restricted internal access</li>
                <li>Monitoring for unauthorized access</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                However, no system is completely secure.
                You use the Service at your own risk, but we take reasonable measures to protect your information.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Children's Privacy</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                MyHomeBase™ is not intended for children under 13.
                We do not knowingly collect information from children under 13.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                If you believe we have collected information from a child, contact us and we will remove it.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">7. Third-Party Links</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">MyHomeBase™ may contain links to:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Contractor websites</li>
                <li>External resources</li>
                <li>How-to videos</li>
                <li>Third-party tools</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                We are not responsible for the privacy practices of these external sites.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">8. Cookies & Tracking</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">MyHomeBase™ may use:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Cookies</li>
                <li>Local storage</li>
                <li>Device identifiers</li>
                <li>Analytics tools</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                These are used only to improve app performance — not to track you across other apps or sell your data.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">9. Your Privacy Rights</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                Depending on your location, you may have the right to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Access your data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion</li>
                <li>Export your data</li>
                <li>Opt out of certain data uses</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                To exercise any of these rights, please contact us through our <a href="/support" className="underline" style={{ color: 'var(--purple)' }}>Support Center</a>.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We will respond within a reasonable time.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">10. Data Not Sold or Shared for Marketing</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">MyHomeBase™ does not:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Sell personal data</li>
                <li>Share personal data with advertising networks</li>
                <li>Track users outside the MyHomeBase™ platform</li>
                <li>Share homeowner or contractor data for commercial purposes</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                Your data is used exclusively to operate and improve the app.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">11. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We may update this Privacy Policy as needed.
                When we make changes, we will update the "Last Updated" date.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                Continued use of the Service means you accept the updated policy.
              </p>
            </div>

            <div className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">12. Contact Us</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                If you have questions about this Privacy Policy, please contact us through our <a href="/support" className="underline" style={{ color: 'var(--purple)' }}>Support Center</a>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

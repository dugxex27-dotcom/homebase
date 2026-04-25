import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center gap-3 mb-2">
              <FileText className="w-8 h-8 text-purple-600" />
              <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
            </div>
            <p className="text-sm text-gray-500">Last Updated: November 15, 2025</p>
          </CardHeader>
          
          <CardContent className="prose prose-sm max-w-none mt-6 space-y-6">
            <div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Welcome to My MyHomeBase™ ("HomeBase," "we," "our," or "us").
                These Terms of Service ("Terms") govern your use of the MyHomeBase™ mobile application, website, and related services (collectively, the "Service").
                By accessing or using MyHomeBase™, you agree to be bound by these Terms.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                If you do not agree with these Terms, do not use the Service.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Eligibility</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                You must be at least 18 years old to use MyHomeBase™.
                By using the Service, you represent that you meet this requirement.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. Description of Service</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                MyHomeBase™ provides tools for homeowners to track home maintenance tasks, receive reminders, store records, connect with contractors, and access contractor listings. Contractors may create profiles, receive inquiries, and manage customer interactions.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                MyHomeBase™ is not a contractor, service provider, or real estate professional.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. User Accounts</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">You are responsible for:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Maintaining the confidentiality of your account</li>
                <li>Keeping your information accurate</li>
                <li>Any activity that occurs under your login</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                We may suspend or terminate accounts that violate these Terms.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Acceptable Use Policy</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                You agree NOT to engage in any of the following activities while using MyHomeBase™:
              </p>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">4.1 Abusive or Harmful Behavior</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">Users may not:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Use abusive, harassing, threatening, or discriminatory language</li>
                <li>Send messages containing slurs, hate speech, bullying, or personal attacks</li>
                <li>Engage in harassment of contractors, homeowners, or support staff</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">4.2 Lewd or Offensive Content</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">Users may not upload, send, or share:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Lewd, pornographic, or sexually explicit images</li>
                <li>Graphic violence</li>
                <li>Offensive or disturbing imagery</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">4.3 Misrepresentation & Fraud</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">Users may not:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Submit false information</li>
                <li>Create fake accounts</li>
                <li>Impersonate another person or business</li>
                <li>Post or solicit fake reviews, misleading ratings, or deceptive endorsements</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">4.4 Spam & Unauthorized Promotion</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">Users may not:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Send spam or repetitive unwanted messages</li>
                <li>Post advertisements without permission</li>
                <li>Use MyHomeBase™ to solicit illegal or unrelated services</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">4.5 Security Violations</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">Users may not:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4 mb-3">
                <li>Attempt to access data not intended for them</li>
                <li>Attempt to interfere with servers or security features</li>
                <li>Upload malicious code, viruses, worms, or exploits</li>
              </ul>

              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">Violation of this section may result in:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Temporary suspension</li>
                <li>Permanent account termination</li>
                <li>Reporting to authorities (if applicable)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Contractor Responsibilities</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">Contractors using MyHomeBase™ agree to:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Provide accurate business information</li>
                <li>Maintain valid licenses, insurance, or certifications as required by local law</li>
                <li>Not post misleading claims about their services</li>
                <li>Not manipulate reviews or ratings</li>
                <li>Not harass or pressure homeowners</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                MyHomeBase™ does not verify contractor credentials and is not responsible for contractor performance.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Homeowner Responsibilities</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">Homeowners agree to:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Provide truthful information about their home</li>
                <li>Not use the Service to harass, discriminate against, or threaten contractors</li>
                <li>Not create duplicate or fake inquiries</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">7. Reviews and Ratings</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">Users may leave reviews and ratings only when:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>They are based on genuine personal experience</li>
                <li>They reflect truthful information</li>
                <li>They are not posted in exchange for compensation or incentives (unless disclosed)</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                MyHomeBase™ may remove reviews that violate this section.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">8. AI Features</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                MyHomeBase™ may provide AI-powered suggestions regarding home maintenance or contractor categories.
                These suggestions:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Are general informational advice</li>
                <li>Are not professional, legal, or technical recommendations</li>
                <li>Should not replace licensed professional guidance</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                You acknowledge and agree that all decisions based on AI suggestions are made at your own discretion and risk.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">9. Payments & Subscriptions</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                Subscription plans, pricing, and payment terms will be displayed within the app. By subscribing, you agree to pay all applicable fees.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">MyHomeBase™ may:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Change pricing with notice</li>
                <li>Suspend accounts for failed payments</li>
                <li>Revoke referral bonuses for fraudulent referrals</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                Subscriptions renew automatically unless canceled.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">10. Third-Party Contractors</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">MyHomeBase™ is not responsible for:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>The quality of contractor work</li>
                <li>Missed appointments</li>
                <li>Property damage</li>
                <li>Pricing disputes</li>
                <li>Communication issues</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                Any agreements made between homeowners and contractors are strictly between those parties.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">11. Data & Privacy</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Use of MyHomeBase™ is also governed by our Privacy Policy.
                You agree that we may collect and use data as described there.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">12. Termination</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">We may suspend or permanently terminate any account for:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Violations of these Terms</li>
                <li>Abusive behavior</li>
                <li>Fraud or manipulation</li>
                <li>Illegal activity</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                You may stop using the Service at any time.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">13. Disclaimer of Warranties</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                MyHomeBase™ is provided "as is" and "as available."
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">We do not guarantee:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Accuracy of content</li>
                <li>Availability or uptime of the app</li>
                <li>That tasks, reminders, or notifications will be timely</li>
                <li>That contractor listings are accurate or updated</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                Use the Service at your own risk.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">14. Limitation of Liability</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                To the fullest extent permitted by law, MyHomeBase™ is not liable for:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>Damages related to contractor performance</li>
                <li>Loss of data</li>
                <li>Loss of profits</li>
                <li>Home damage</li>
                <li>Emotional distress</li>
                <li>Bugs, errors, or outages</li>
                <li>Unauthorized access to your account</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                Your only remedy for dissatisfaction is to stop using the Service.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">15. Dispute Resolution & Arbitration</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Any dispute arising under these Terms will be settled through binding arbitration, not a court trial.
                You waive your right to participate in class-action lawsuits.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">16. Changes to Terms</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                MyHomeBase™ may update these Terms at any time. Continued use of the Service constitutes acceptance of the revised Terms.
              </p>
            </div>

            <div className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">17. Contact Information</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                For questions about these Terms, please contact us through our <a href="/support" className="text-purple-600 hover:text-purple-700 underline">Support Center</a>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

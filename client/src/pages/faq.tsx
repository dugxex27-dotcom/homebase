import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DollarSign, Users, MapPin, HelpCircle, Home, Wrench, Building2 } from "lucide-react";
import logoColor from "@assets/my-homebase-logo-color_1768271270022.png";

export default function FAQ() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <img 
              src={logoColor} 
              alt="My HomeBase" 
              className="h-8 sm:h-10 w-auto"
            />
          </a>
          <a 
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Back to Home
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: '#2c0f5b' }}>
            Frequently Asked Questions
          </h1>
          <p className="text-gray-600 text-lg">
            Everything you need to know about My HomeBase
          </p>
        </div>

        <Tabs defaultValue="pricing" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-8">
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Pricing</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Referrals</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Maintenance</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  Pricing & Subscriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="homeowner-pricing">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-purple-600" />
                        What are the homeowner subscription plans?
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>My HomeBase offers flexible subscription plans for homeowners:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Free Trial:</strong> 14-day free trial with full access to all features</li>
                        <li><strong>Monthly Plan:</strong> $9.99/month - Full access to all home management features</li>
                        <li><strong>Annual Plan:</strong> $99.99/year - Save over 15% compared to monthly billing</li>
                      </ul>
                      <p>Free users can still search for contractors and send messages, but home management features require a paid subscription.</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="contractor-pricing">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-blue-600" />
                        What are the contractor subscription plans?
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>Contractors can choose from two professional plans:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Free Trial:</strong> 14-day free trial to explore all features</li>
                        <li><strong>Basic Plan:</strong> $19.99/month - Professional profile, client messaging, and basic CRM tools</li>
                        <li><strong>Pro Plan:</strong> $39.99/month - Everything in Basic plus advanced CRM, proposal tools, priority listing, and detailed analytics</li>
                      </ul>
                      <p>After the trial expires, contractors need an active subscription to access all platform features.</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="free-features">
                    <AccordionTrigger className="text-left">
                      What can I do for free?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p><strong>Homeowners (Free Tier):</strong></p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Search for contractors in your area</li>
                        <li>View contractor profiles and reviews</li>
                        <li>Send messages to contractors</li>
                      </ul>
                      <p className="mt-3"><strong>Contractors:</strong></p>
                      <p>Contractors receive a 14-day free trial. After the trial expires, an active subscription is required to continue using the platform.</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="cancel-subscription">
                    <AccordionTrigger className="text-left">
                      Can I cancel my subscription anytime?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      Yes! You can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period. No refunds are provided for partial months, but you won't be charged again after cancellation.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="payment-methods">
                    <AccordionTrigger className="text-left">
                      What payment methods do you accept?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      We accept all major credit cards (Visa, Mastercard, American Express, Discover) through our secure payment processor, Stripe. All transactions are encrypted and PCI-compliant.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  Referral Program
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="how-referrals-work">
                    <AccordionTrigger className="text-left">
                      How does the referral program work?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>My HomeBase rewards you for spreading the word! Here's how it works:</p>
                      <ol className="list-decimal pl-6 space-y-2">
                        <li>Share your unique referral code or link with friends and colleagues</li>
                        <li>When someone signs up using your code and subscribes to a paid plan</li>
                        <li>After they've been a paying subscriber for 4 months, you earn $15 credit</li>
                        <li>Credits are applied to your next billing cycle</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="agent-referrals">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        How do real estate agent referrals work?
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>Real estate agents have a special affiliate program:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Sign up as a Real Estate Agent to get your unique referral code</li>
                        <li>Share your code with homeowners and contractors you work with</li>
                        <li>Earn $15 for each referral who becomes a paid subscriber for 4+ months</li>
                        <li>Payouts are processed automatically through Stripe Connect</li>
                        <li>Track all your referrals and earnings in your dashboard</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="referral-credit-limits">
                    <AccordionTrigger className="text-left">
                      Are there limits on referral credits?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>Yes, there are monthly caps on referral credits based on your role:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Homeowners:</strong> Up to $30/month in referral credits</li>
                        <li><strong>Contractors (Basic):</strong> Up to $40/month in referral credits</li>
                        <li><strong>Contractors (Pro):</strong> Up to $80/month in referral credits</li>
                        <li><strong>Real Estate Agents:</strong> No cap - earn unlimited through Stripe Connect payouts</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="find-referral-code">
                    <AccordionTrigger className="text-left">
                      Where do I find my referral code?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      Your unique referral code is available in your account settings or dashboard. You can copy the code directly or share a personalized referral link that automatically applies your code when someone signs up.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="referral-payout">
                    <AccordionTrigger className="text-left">
                      When do I receive my referral rewards?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      Referral rewards are credited after your referral has maintained a paid subscription for 4 consecutive months. This ensures genuine, long-term users. For homeowners and contractors, credits are applied to your account. For real estate agents, payouts are processed through Stripe Connect to your connected bank account.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  Maintenance & Location Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="location-maintenance">
                    <AccordionTrigger className="text-left">
                      How does location-based maintenance work?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>When you add a home to My HomeBase, we use the address you provide to determine your property's climate zone. This allows us to generate personalized maintenance schedules based on:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Climate Zone:</strong> Hot, cold, humid, or mixed climates have different maintenance needs</li>
                        <li><strong>Seasonal Timing:</strong> Tasks are scheduled for the appropriate season in your region</li>
                        <li><strong>Local Conditions:</strong> Recommendations account for regional weather patterns</li>
                      </ul>
                      <p className="mt-3">For example, homes in cold climates will receive reminders to winterize pipes and service heating systems before winter, while homes in hot climates will get AC maintenance reminders before summer.</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="climate-zones">
                    <AccordionTrigger className="text-left">
                      What climate zones does My HomeBase support?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>We support multiple climate zones across the United States:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Hot-Humid:</strong> Southeast, Gulf Coast (Florida, Texas coast, etc.)</li>
                        <li><strong>Hot-Dry:</strong> Southwest deserts (Arizona, Nevada, etc.)</li>
                        <li><strong>Cold:</strong> Northern states, mountain regions (Minnesota, Montana, etc.)</li>
                        <li><strong>Mixed-Humid:</strong> Mid-Atlantic, Southeast (Virginia, North Carolina, etc.)</li>
                        <li><strong>Mixed-Dry:</strong> Plains states (Kansas, Oklahoma, etc.)</li>
                        <li><strong>Marine:</strong> Pacific Northwest (Seattle, Portland, etc.)</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="maintenance-schedule">
                    <AccordionTrigger className="text-left">
                      How are maintenance tasks scheduled?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>Maintenance tasks are automatically generated based on:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Home Systems:</strong> The appliances and systems you've added to your property (HVAC, water heater, roof, etc.)</li>
                        <li><strong>System Age:</strong> Older systems may require more frequent maintenance</li>
                        <li><strong>Manufacturer Recommendations:</strong> Standard maintenance intervals for each system type</li>
                        <li><strong>Seasonal Needs:</strong> Tasks aligned with your local climate and seasons</li>
                      </ul>
                      <p className="mt-3">You'll receive weekly email reminders every Friday with your upcoming maintenance tasks, prioritized by urgency.</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="customize-tasks">
                    <AccordionTrigger className="text-left">
                      Can I customize my maintenance tasks?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      Yes! While we generate recommended maintenance tasks based on your home's systems and location, you can mark tasks as complete, skip tasks, or add custom maintenance reminders. You can also adjust your notification preferences to control when and how you receive reminders.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="contractor-matching">
                    <AccordionTrigger className="text-left">
                      How does contractor matching work with my location?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>When you search for contractors, we use your property's location to find qualified professionals nearby:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Contractors are filtered to show those within 20 miles of your property</li>
                        <li>Results are sorted by distance and ratings</li>
                        <li>You can see each contractor's service area and specialties</li>
                        <li>AI-powered recommendations suggest contractors based on your specific maintenance needs</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-gray-600" />
                  General Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="what-is-homebase">
                    <AccordionTrigger className="text-left">
                      What is My HomeBase?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>My HomeBase is a comprehensive home management platform that serves as your home's digital record - like a Carfax for your house. We help you:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Track all home systems, appliances, and their maintenance history</li>
                        <li>Receive personalized, location-based maintenance reminders</li>
                        <li>Find and connect with qualified local contractors</li>
                        <li>Manage multiple properties from one dashboard</li>
                        <li>Build a complete service record that adds value when selling your home</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="multiple-properties">
                    <AccordionTrigger className="text-left">
                      Can I manage multiple properties?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      Yes! My HomeBase supports multiple properties under a single account. Each property gets its own maintenance schedule based on its location and systems. This is perfect for homeowners with vacation homes, rental properties, or investment properties.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="home-health-score">
                    <AccordionTrigger className="text-left">
                      What is the Home Health Score?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>The Home Health Score is a gamified metric that reflects how well-maintained your home is. Your score improves when you:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Complete recommended maintenance tasks on time</li>
                        <li>Add and track all your home systems</li>
                        <li>Log service records from contractors</li>
                        <li>Keep your home information up to date</li>
                      </ul>
                      <p className="mt-3">A high Home Health Score demonstrates to potential buyers that your home has been well-cared for.</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="data-security">
                    <AccordionTrigger className="text-left">
                      How is my data protected?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>We take data security seriously with enterprise-grade protection:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>AES-256 encryption for sensitive data</li>
                        <li>Secure, encrypted connections (HTTPS/TLS)</li>
                        <li>Regular security audits and monitoring</li>
                        <li>Strict access controls and authentication</li>
                        <li>SOC 2 Type II compliant technical controls</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="share-records">
                    <AccordionTrigger className="text-left">
                      Can I share my home records with others?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>Yes! My HomeBase makes it easy to share your home information:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Connection Codes:</strong> Generate a permanent code to share with contractors for service access</li>
                        <li><strong>House Transfer:</strong> When selling your home, transfer the complete history to the new owner</li>
                        <li><strong>Contractor Access:</strong> Contractors you've worked with can view relevant service history</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="contact-support">
                    <AccordionTrigger className="text-left">
                      How do I contact support?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      You can reach our support team through multiple channels:
                      <ul className="list-disc pl-6 space-y-2 mt-2">
                        <li>Use the <a href="/contact" className="text-purple-600 hover:underline">Contact Us</a> page to submit a support ticket</li>
                        <li>Email us at gotohomebase2025@gmail.com</li>
                        <li>Logged-in users can create support tickets directly from the Support page in their dashboard</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="mobile-app">
                    <AccordionTrigger className="text-left">
                      Is there a mobile app?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      My HomeBase is built as a progressive web app (PWA), which means you can access it from any device's web browser. You can also add it to your phone's home screen for an app-like experience without needing to download from an app store.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-12 p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#2c0f5b' }}>
            Still have questions?
          </h3>
          <p className="text-gray-600 mb-4">
            We're here to help! Reach out to our support team.
          </p>
          <a 
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-colors"
            style={{ backgroundColor: '#2c0f5b' }}
          >
            Contact Us
          </a>
        </div>
      </main>

      <footer className="bg-gray-100 border-t border-gray-200 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-600 text-sm">
          <p>&copy; {new Date().getFullYear()} My HomeBase. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="/terms-of-service" className="hover:underline">Terms of Service</a>
            <a href="/privacy-policy" className="hover:underline">Privacy Policy</a>
            <a href="/legal-disclaimer" className="hover:underline">Legal Disclaimer</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

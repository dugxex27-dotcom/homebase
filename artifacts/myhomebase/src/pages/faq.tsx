import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DollarSign, Users, MapPin, HelpCircle, Home, Wrench, Building2 } from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";
import logoColor from "@assets/my-homebase-logo-tm-final_1776295160061.png";

export default function FAQ() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <img 
              src={logoColor} 
              alt="MyHomeBase™" 
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
            Everything you need to know about MyHomeBase™
          </p>
        </div>

        <Tabs defaultValue="pricing" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-8 bg-purple-100">
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
                      <p>MyHomeBase™ offers tiered subscription plans based on the number of homes you manage:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Free:</strong> $0/month - Search for contractors, view your past contractors, and make payments through the app. No home management features.</li>
                        <li><strong>Base:</strong> $5/month - Manage 1-2 homes with maintenance tracking, home health score, DIY savings tracker, and service records. Earn up to $5/month in referral credits.</li>
                        <li><strong>Premium:</strong> $20/month - Manage 3-6 homes with all Base features plus priority contractor matching and advanced maintenance insights. Earn up to $20/month in referral credits.</li>
                        <li><strong>Premium Plus:</strong> $40/month - Unlimited homes with all Premium features plus dedicated support and bulk maintenance scheduling. Earn up to $40/month in referral credits.</li>
                      </ul>
                      <p>New users start with a 14-day free trial with full access to all features.</p>
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
                        <li><strong>Basic:</strong> $20/month - Get found by homeowners, messaging, send proposals, reviews and ratings profile. Earn up to $20/month in referral credits.</li>
                        <li><strong>Pro:</strong> $40/month - Everything in Basic plus full CRM with client management, job scheduling & tracking, quotes & invoices, accept payments via Stripe Connect, team management, import from Jobber/ServiceTitan, and business analytics dashboard. Earn up to $40/month in referral credits.</li>
                      </ul>
                      <p>New contractors start with a 14-day free trial. After the trial expires, an active subscription is required to continue using the platform.</p>
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
                        <li>View your past contractors</li>
                        <li>Make payments through the app</li>
                      </ul>
                      <p className="mt-2 text-sm">Note: Home management features (maintenance tracking, home health score, service records) require a paid subscription starting at $5/month.</p>
                      <p className="mt-3"><strong>Contractors:</strong></p>
                      <p>Contractors receive a 14-day free trial with full access. After the trial expires, an active subscription ($20/month Basic or $40/month Pro) is required to continue using the platform.</p>
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
                      <p>MyHomeBase™ rewards you for spreading the word! Here's how it works:</p>
                      <ol className="list-decimal pl-6 space-y-2">
                        <li>Share your unique referral code or link with friends and colleagues</li>
                        <li>When someone signs up using your code and subscribes to a paid plan</li>
                        <li>You earn $1 off per month for each paid subscriber who used your code</li>
                        <li>Credits are applied to your next billing cycle (capped at your subscription tier amount)</li>
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
                      <p>You earn $1 off per month for each paid subscriber who used your code, but credits are capped at your subscription tier amount:</p>
                      <p className="font-medium mt-2">Homeowners:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li><strong>Free:</strong> No referral credits (upgrade to earn)</li>
                        <li><strong>Base ($5/month):</strong> Up to $5/month (5 referrals = free subscription)</li>
                        <li><strong>Premium ($20/month):</strong> Up to $20/month (20 referrals = free subscription)</li>
                        <li><strong>Premium Plus ($40/month):</strong> Up to $40/month (40 referrals = free subscription)</li>
                      </ul>
                      <p className="font-medium mt-3">Contractors:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li><strong>Basic ($20/month):</strong> Up to $20/month (20 referrals = free subscription)</li>
                        <li><strong>Pro ($40/month):</strong> Up to $40/month (40 referrals = free subscription)</li>
                      </ul>
                      <p className="font-medium mt-3">Real Estate Agents:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>No cap - earn unlimited $15 payouts through Stripe Connect</li>
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
                      For homeowners and contractors, you receive $1 off per month for each active paid subscriber who used your referral code. Credits are applied automatically to your billing cycle. For real estate agents, you earn a $15 payout after your referral has maintained a paid subscription for 4 consecutive months, processed through Stripe Connect to your connected bank account.
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
                      <p>When you add a home to MyHomeBase™, we use the address you provide to determine your property's climate zone. This allows us to generate personalized maintenance schedules based on:</p>
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
                      What climate zones does MyHomeBase™ support?
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
                        <li>Contractors are filtered based on your search criteria and whether your property falls within their service radius</li>
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
                      What is MyHomeBase™?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>MyHomeBase™ is a comprehensive home management platform that serves as your home's digital record - like a Carfax for your house. We help you:</p>
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
                      Yes! MyHomeBase™ supports multiple properties under a single account. Each property gets its own maintenance schedule based on its location and systems. This is perfect for homeowners with vacation homes, rental properties, or investment properties.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="home-health-score">
                    <AccordionTrigger className="text-left">
                      What is the Home Wellness Score™?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 space-y-3">
                      <p>The Home Wellness Score™ is a gamified metric that reflects how well-maintained your home is. Your score improves when you:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Complete recommended maintenance tasks on time</li>
                        <li>Add and track all your home systems</li>
                        <li>Log service records from contractors</li>
                        <li>Keep your home information up to date</li>
                      </ul>
                      <p className="mt-3">A high Home Wellness Score™ demonstrates to potential buyers that your home has been well-cared for.</p>
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
                      <p>Yes! MyHomeBase™ makes it easy to share your home information:</p>
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
                      MyHomeBase™ is built as a progressive web app (PWA), which means you can access it from any device's web browser. You can also add it to your phone's home screen for an app-like experience without needing to download from an app store.
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
          <div className="flex items-center justify-center gap-4 mb-4">
            <a 
              href="https://www.facebook.com/share/1H6GxEER1K/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              aria-label="Facebook"
            >
              <SiFacebook className="w-5 h-5" style={{ color: '#1877F2' }} />
            </a>
            <a 
              href="https://www.instagram.com/gotohomebase?igsh=MTV3OHJpazkwZXVwYQ==" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              aria-label="Instagram"
            >
              <SiInstagram className="w-5 h-5" style={{ color: '#E4405F' }} />
            </a>
          </div>
          <p>&copy; {new Date().getFullYear()} MyHomeBase™. All rights reserved.</p>
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

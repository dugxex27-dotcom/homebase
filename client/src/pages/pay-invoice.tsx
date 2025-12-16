import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, CheckCircle2, XCircle, Loader2, Building2, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { Helmet } from "react-helmet";

interface InvoiceDetails {
  id: string;
  invoiceNumber: string;
  title: string;
  description: string | null;
  status: string;
  totalAmount: string;
  dueDate: string | null;
  lineItems: any[] | null;
  clientName: string;
  contractorName: string;
  companyName: string | null;
  companyLogo: string | null;
}

export default function PayInvoicePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [location] = useLocation();

  const { data: invoice, isLoading, error } = useQuery<InvoiceDetails>({
    queryKey: ['/api/pay/invoice', invoiceId],
    enabled: !!invoiceId,
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/pay/invoice/${invoiceId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
            <p className="text-muted-foreground">
              This invoice may have been removed or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invoice.status === 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Helmet>
          <title>Invoice Paid | Home Base</title>
        </Helmet>
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invoice Already Paid</h2>
            <p className="text-muted-foreground">
              This invoice has already been paid. Thank you!
            </p>
            <Badge className="mt-4 bg-green-100 text-green-700">
              {invoice.invoiceNumber}
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lineItems = invoice.lineItems || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Helmet>
        <title>Pay Invoice {invoice.invoiceNumber} | Home Base</title>
      </Helmet>
      
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center border-b">
            {invoice.companyLogo ? (
              <img 
                src={invoice.companyLogo} 
                alt={invoice.companyName || 'Company'} 
                className="h-16 w-auto mx-auto mb-4 object-contain"
              />
            ) : (
              <Building2 className="h-12 w-12 mx-auto mb-4 text-purple-600" />
            )}
            <CardTitle className="text-2xl">{invoice.companyName || invoice.contractorName}</CardTitle>
            <CardDescription>Invoice {invoice.invoiceNumber}</CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Bill To</p>
                <p className="font-medium">{invoice.clientName}</p>
              </div>
              {invoice.dueDate && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {invoice.title}
              </h3>
              {invoice.description && (
                <p className="text-muted-foreground text-sm mb-4">{invoice.description}</p>
              )}

              {lineItems.length > 0 && (
                <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                  {lineItems.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.description}
                        {item.quantity > 1 && ` (x${item.quantity})`}
                      </span>
                      <span className="font-medium">
                        ${(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total Due</span>
              <span className="text-purple-600">${parseFloat(invoice.totalAmount).toFixed(2)}</span>
            </div>

            <Button 
              size="lg" 
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              data-testid="button-pay-invoice"
            >
              {checkoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Pay ${parseFloat(invoice.totalAmount).toFixed(2)}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment powered by Stripe. Your payment information is never stored on our servers.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Helmet>
        <title>Payment Successful | Home Base</title>
      </Helmet>
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Payment Successful!</h2>
          <p className="text-muted-foreground mb-4">
            Thank you for your payment. A confirmation has been sent to your email.
          </p>
          <Button onClick={() => window.close()} variant="outline">
            Close This Window
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function PaymentCancelledPage() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Helmet>
        <title>Payment Cancelled | Home Base</title>
      </Helmet>
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <XCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Payment Cancelled</h2>
          <p className="text-muted-foreground mb-4">
            Your payment was cancelled. No charges were made.
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { ContractorCRMUpgradePage } from "@/components/contractor-feature-gate";
import { Helmet } from "react-helmet";

export default function ContractorUpgrade() {
  return (
    <>
      <Helmet>
        <title>Upgrade to Pro | Home Base</title>
        <meta name="description" content="Upgrade to Contractor Pro for full CRM features including client management, job scheduling, quotes, invoices, and payment processing." />
      </Helmet>
      <ContractorCRMUpgradePage />
    </>
  );
}

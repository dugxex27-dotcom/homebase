import { ContractorCRMUpgradePage } from "@/components/contractor-feature-gate";
import { Helmet } from "react-helmet";

export default function ContractorUpgrade() {
  return (
    <>
      <Helmet>
        <title>Contractor Plan | Home Base</title>
        <meta name="description" content="Subscribe to the Home Base contractor plan for $20 per month, including three accepted people and full business management features." />
      </Helmet>
      <ContractorCRMUpgradePage />
    </>
  );
}

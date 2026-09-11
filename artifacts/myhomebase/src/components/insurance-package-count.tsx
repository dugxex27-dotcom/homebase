import { useQueries, type QueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface HouseIdentity {
  id: string;
}

export function insurancePackageQueryKey(houseId: string) {
  return ["/api/houses", houseId, "insurance-claim-packages"] as const;
}

export function cacheGeneratedInsurancePackage(
  queryClient: QueryClient,
  houseId: string,
  generatedPackage: unknown,
) {
  queryClient.setQueryData<unknown[]>(
    insurancePackageQueryKey(houseId),
    (current = []) => {
      const generatedId = (generatedPackage as { id?: unknown } | null)?.id;
      if (
        generatedId != null
        && current.some((item) => (item as { id?: unknown } | null)?.id === generatedId)
      ) {
        return current;
      }
      return [...current, generatedPackage];
    },
  );
}

export function InsurancePrepCountLabel({
  houses,
  enabled,
}: {
  houses: HouseIdentity[];
  enabled: boolean;
}) {
  const packageQueries = useQueries({
    queries: houses.map((house) => ({
      queryKey: insurancePackageQueryKey(house.id),
      queryFn: async (): Promise<unknown[]> => {
        const res = await apiRequest(`/api/houses/${house.id}/insurance-claim-packages`);
        return res.json();
      },
      enabled,
    })),
  });
  const count = packageQueries.reduce(
    (total, query) => total + (Array.isArray(query.data) ? query.data.length : 0),
    0,
  );

  return <>Insurance Prep{count > 0 && ` (${count})`}</>;
}
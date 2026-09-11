interface InsuranceClaimPackageDeletionStorage {
  deleteInsuranceClaimPackage(
    packageId: string,
    houseId: string,
    homeownerId: string,
  ): Promise<boolean>;
}

export function createDeleteInsuranceClaimPackageHandler(
  storage: InsuranceClaimPackageDeletionStorage,
) {
  return async (req: any, res: any) => {
    try {
      const { houseId, packageId } = req.params;
      const homeownerId = req.session.user.id;
      const deleted = await storage.deleteInsuranceClaimPackage(
        packageId,
        houseId,
        homeownerId,
      );
      if (!deleted) {
        return res.status(404).json({ message: "Claim package not found" });
      }
      return res.status(204).send();
    } catch (error) {
      console.error("[INSURANCE CLAIM PACKAGE DELETE] Error:", error);
      return res.status(500).json({ message: "Failed to delete claim package" });
    }
  };
}
export type ConversationParties = {
  homeownerId: string;
  contractorId: string;
};

export function isConversationParticipant(
  conversation: ConversationParties,
  userId: string,
  userType: string,
): boolean {
  return (
    (userType === "homeowner" && conversation.homeownerId === userId) ||
    (userType === "contractor" && conversation.contractorId === userId)
  );
}
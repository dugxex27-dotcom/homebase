type LeadSummary = {
  status: string;
  createdAt: string | Date | null;
};

type AppointmentSummary = {
  homeownerId: string;
  serviceType: string;
  status: string;
  scheduledDateTime: string;
};

type ProposalSummary = {
  homeownerId: string | null;
  serviceType: string;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function countRecentNewLeads(
  leads: LeadSummary[],
  now = new Date(),
) {
  const cutoff = now.getTime() - SEVEN_DAYS_MS;

  return leads.filter((lead) => {
    if (lead.status !== "new" || !lead.createdAt) return false;
    const createdAt = new Date(lead.createdAt).getTime();
    return !Number.isNaN(createdAt) && createdAt >= cutoff && createdAt <= now.getTime();
  }).length;
}

export function getAppointmentsInNextSevenDays<T extends AppointmentSummary>(
  appointments: T[],
  now = new Date(),
): T[] {
  const start = now.getTime();
  const end = start + SEVEN_DAYS_MS;

  return appointments
    .filter((appointment) => {
      const scheduledAt = new Date(appointment.scheduledDateTime).getTime();
      return !Number.isNaN(scheduledAt) && scheduledAt >= start && scheduledAt <= end;
    })
    .sort(
      (a, b) =>
        new Date(a.scheduledDateTime).getTime() -
        new Date(b.scheduledDateTime).getTime(),
    );
}

export function hasScheduledAppointmentForProposal(
  proposal: ProposalSummary,
  appointments: AppointmentSummary[],
  now = new Date(),
) {
  if (!proposal.homeownerId) return false;

  const proposalServiceType = proposal.serviceType.trim().toLowerCase();
  const currentTime = now.getTime();

  return appointments.some((appointment) => {
    const scheduledAt = new Date(appointment.scheduledDateTime).getTime();
    const isFutureScheduledAppointment =
      (appointment.status === "scheduled" || appointment.status === "confirmed") &&
      !Number.isNaN(scheduledAt) &&
      scheduledAt >= currentTime;

    return (
      isFutureScheduledAppointment &&
      appointment.homeownerId === proposal.homeownerId &&
      appointment.serviceType.trim().toLowerCase() === proposalServiceType
    );
  });
}
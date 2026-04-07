import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type MembershipRow = {
  organization_id: string;
  role: string | null;
};

type WorkCenterRow = {
  id: string;
  provider_org_id: string;
};

type CapabilityRow = {
  id: string;
  provider_org_id: string;
};

type PackageRow = {
  id: string;
  provider_org_id: string;
  customer_org_id: string | null;
  service_request_id: string | null;
  package_status: string;
  package_title: string | null;
  requested_quantity: number | null;
};

type BookingRow = {
  id: string;
  provider_org_id: string;
  provider_request_package_id: string | null;
  booking_status: string;
};

type ScheduleBlockRow = {
  id: string;
  provider_org_id: string;
};

export const PROVIDER_WORK_CENTER_TYPES = [
  "machine",
  "work_cell",
  "manual_station",
  "inspection_station",
  "design_station",
] as const;

export const PROVIDER_SCHEDULE_BLOCK_TYPES = [
  "maintenance",
  "downtime",
  "holiday",
  "internal_hold",
  "other",
] as const;

export const PROVIDER_BOOKING_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

export const PROVIDER_BOOKING_STATUSES = [
  "unscheduled",
  "scheduled",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
] as const;

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function isAllowedValue<T extends readonly string[]>(
  value: string | null | undefined,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && allowed.includes(value as T[number]);
}

export function parseDateRange(
  startDate: string | null,
  endDate: string | null,
) {
  if (!startDate || !endDate) {
    return {
      ok: false as const,
      response: jsonError("Start date and end date are required.", 400),
    };
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      ok: false as const,
      response: jsonError("Invalid start date or end date.", 400),
    };
  }

  if (end.getTime() <= start.getTime()) {
    return {
      ok: false as const,
      response: jsonError("End date must be after start date.", 400),
    };
  }

  return {
    ok: true as const,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}

export async function requireRouteUser(supabase: SupabaseServerClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false as const,
      response: jsonError("Unauthorized.", 401),
    };
  }

  return {
    ok: true as const,
    user,
  };
}

export async function requireProviderOrgManager(
  supabase: SupabaseServerClient,
  providerOrgId: string,
  userId: string,
  actionLabel: string,
) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", providerOrgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      response: jsonError(error.message, 500),
    };
  }

  const membership = data as MembershipRow | null;

  if (!membership || !["admin", "engineer"].includes(membership.role ?? "")) {
    return {
      ok: false as const,
      response: jsonError(
        `You do not have permission to ${actionLabel}.`,
        403,
      ),
    };
  }

  return {
    ok: true as const,
  };
}

export async function getWorkCenterInOrg(
  supabase: SupabaseServerClient,
  workCenterId: string,
  providerOrgId: string,
) {
  const { data, error } = await supabase
    .from("provider_work_centers")
    .select("id, provider_org_id")
    .eq("id", workCenterId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      response: jsonError(error.message, 500),
    };
  }

  const workCenter = data as WorkCenterRow | null;

  if (!workCenter || workCenter.provider_org_id !== providerOrgId) {
    return {
      ok: false as const,
      response: jsonError(
        "Work center does not belong to this provider organization.",
        400,
      ),
    };
  }

  return {
    ok: true as const,
    workCenter,
  };
}

export async function getCapabilityInOrg(
  supabase: SupabaseServerClient,
  capabilityId: string,
  providerOrgId: string,
) {
  const { data, error } = await supabase
    .from("provider_capabilities")
    .select("id, provider_org_id")
    .eq("id", capabilityId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      response: jsonError(error.message, 500),
    };
  }

  const capability = data as CapabilityRow | null;

  if (!capability || capability.provider_org_id !== providerOrgId) {
    return {
      ok: false as const,
      response: jsonError(
        "Capability does not belong to this provider organization.",
        400,
      ),
    };
  }

  return {
    ok: true as const,
    capability,
  };
}

export async function requireCapabilityMappedToWorkCenter(
  supabase: SupabaseServerClient,
  workCenterId: string,
  capabilityId: string,
) {
  const { data, error } = await supabase
    .from("provider_work_center_capabilities")
    .select("provider_work_center_id, provider_capability_id")
    .eq("provider_work_center_id", workCenterId)
    .eq("provider_capability_id", capabilityId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      response: jsonError(error.message, 500),
    };
  }

  if (!data) {
    return {
      ok: false as const,
      response: jsonError(
        "Capability is not mapped to the selected work center.",
        400,
      ),
    };
  }

  return {
    ok: true as const,
  };
}

export async function getAwardedProviderPackageInOrg(
  supabase: SupabaseServerClient,
  providerRequestPackageId: string,
  providerOrgId: string,
) {
  const { data, error } = await supabase
    .from("provider_request_packages")
    .select(
      "id, provider_org_id, customer_org_id, service_request_id, package_status, package_title, requested_quantity",
    )
    .eq("id", providerRequestPackageId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      response: jsonError(error.message, 500),
    };
  }

  const pkg = data as PackageRow | null;

  if (!pkg || pkg.provider_org_id !== providerOrgId) {
    return {
      ok: false as const,
      response: jsonError(
        "Package not found for this provider organization.",
        404,
      ),
    };
  }

  if (pkg.package_status !== "awarded") {
    return {
      ok: false as const,
      response: jsonError(
        "Only awarded packages can be turned into schedule bookings.",
        400,
      ),
    };
  }

  return {
    ok: true as const,
    pkg,
  };
}

export async function ensureNoActiveBookingForPackage(
  supabase: SupabaseServerClient,
  providerRequestPackageId: string,
) {
  const { data, error } = await supabase
    .from("provider_job_bookings")
    .select("id, provider_org_id, provider_request_package_id, booking_status")
    .eq("provider_request_package_id", providerRequestPackageId)
    .neq("booking_status", "cancelled")
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      response: jsonError(error.message, 500),
    };
  }

  const booking = data as BookingRow | null;

  if (booking) {
    return {
      ok: false as const,
      response: jsonError(
        "This awarded package already has an active schedule booking.",
        409,
      ),
    };
  }

  return {
    ok: true as const,
  };
}

export async function getManagedWorkCenter(
  supabase: SupabaseServerClient,
  workCenterId: string,
  userId: string,
  actionLabel: string,
) {
  const { data, error } = await supabase
    .from("provider_work_centers")
    .select("id, provider_org_id")
    .eq("id", workCenterId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      response: jsonError(error.message, 500),
    };
  }

  const workCenter = data as WorkCenterRow | null;

  if (!workCenter) {
    return {
      ok: false as const,
      response: jsonError("Work center not found.", 404),
    };
  }

  const access = await requireProviderOrgManager(
    supabase,
    workCenter.provider_org_id,
    userId,
    actionLabel,
  );

  if (!access.ok) {
    return access;
  }

  return {
    ok: true as const,
    workCenter,
  };
}

export async function getManagedBooking(
  supabase: SupabaseServerClient,
  bookingId: string,
  userId: string,
  actionLabel: string,
) {
  const { data, error } = await supabase
    .from("provider_job_bookings")
    .select("id, provider_org_id, provider_request_package_id, booking_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      response: jsonError(error.message, 500),
    };
  }

  const booking = data as BookingRow | null;

  if (!booking) {
    return {
      ok: false as const,
      response: jsonError("Booking not found.", 404),
    };
  }

  const access = await requireProviderOrgManager(
    supabase,
    booking.provider_org_id,
    userId,
    actionLabel,
  );

  if (!access.ok) {
    return access;
  }

  return {
    ok: true as const,
    booking,
  };
}

export async function getManagedScheduleBlock(
  supabase: SupabaseServerClient,
  blockId: string,
  userId: string,
  actionLabel: string,
) {
  const { data, error } = await supabase
    .from("provider_schedule_blocks")
    .select("id, provider_org_id")
    .eq("id", blockId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      response: jsonError(error.message, 500),
    };
  }

  const block = data as ScheduleBlockRow | null;

  if (!block) {
    return {
      ok: false as const,
      response: jsonError("Schedule block not found.", 404),
    };
  }

  const access = await requireProviderOrgManager(
    supabase,
    block.provider_org_id,
    userId,
    actionLabel,
  );

  if (!access.ok) {
    return access;
  }

  return {
    ok: true as const,
    block,
  };
}
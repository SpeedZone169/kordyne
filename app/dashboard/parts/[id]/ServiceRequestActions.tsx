"use client";

import { useState } from "react";
import { createClient } from "../../../../lib/supabase/client";

type ServiceRequestActionsProps = {
  partId: string;
  organizationId: string;
  canRequest: boolean;
};

type RequestType = "manufacture_part" | "cad_creation" | "optimization";

const REQUEST_OPTIONS: Array<{
  value: RequestType;
  label: string;
}> = [
  { value: "manufacture_part", label: "Manufacture this part" },
  { value: "cad_creation", label: "Request CAD creation" },
  { value: "optimization", label: "Request optimization" },
];

export default function ServiceRequestActions({
  partId,
  organizationId,
  canRequest,
}: ServiceRequestActionsProps) {
  const supabase = createClient();

  const [notes, setNotes] = useState("");
  const [loadingType, setLoadingType] = useState<RequestType | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRequest(requestType: RequestType) {
    setError("");
    setSuccess("");

    if (!canRequest) {
      setError("Only engineers and admins can create service requests.");
      return;
    }

    setLoadingType(requestType);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in.");
        return;
      }

      const { error } = await supabase.from("service_requests").insert({
        organization_id: organizationId,
        part_id: partId,
        requested_by_user_id: user.id,
        request_type: requestType,
        status: "submitted",
        notes: notes.trim() || null,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Service request submitted.");
      setNotes("");
    } catch {
      setError("Something went wrong while submitting the request.");
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Service Requests</h2>
      <p className="mt-4 text-sm text-gray-600">
        Start a service workflow directly from this part.
      </p>

      {!canRequest ? (
        <p className="mt-4 text-sm text-gray-600">
          Service requests are available to engineers and admins only.
        </p>
      ) : null}

      <div className="mt-6">
        <label className="mb-2 block text-sm font-medium">
          Notes for the request
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!canRequest || Boolean(loadingType)}
          className="min-h-[110px] w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
          placeholder="Optional: delivery context, target quantity, technical concerns, or request details."
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {REQUEST_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleRequest(option.value)}
            disabled={!canRequest || Boolean(loadingType)}
            className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loadingType === option.value ? "Submitting..." : option.label}
          </button>
        ))}
      </div>

      {success ? <p className="mt-4 text-sm text-green-700">{success}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
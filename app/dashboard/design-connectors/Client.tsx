"use client";

import { useMemo, useState } from "react";
import type {
  DesignConnectorListItem,
  DesignConnectorProfileRecord,
  DesignSyncRunRecord,
} from "../../../lib/design-connectors/types";

type ClientProps = {
  initialConnectors: DesignConnectorListItem[];
  initialProfiles: Array<
    Pick<
      DesignConnectorProfileRecord,
      | "id"
      | "provider_key"
      | "display_name"
      | "auth_mode"
      | "last_test_status"
      | "organization_id"
    >
  >;
  initialRuns: Array<
    Pick<
      DesignSyncRunRecord,
      | "id"
      | "provider_key"
      | "run_type"
      | "direction"
      | "status"
      | "started_at"
      | "completed_at"
      | "design_connector_id"
    >
  >;
  organizationId: string;
  currentUserId: string;
  isOrgAdmin: boolean;
};

const PROVIDERS = ["fusion", "solidworks", "inventor", "onshape"] as const;

type ProviderFilter = "all" | (typeof PROVIDERS)[number];

function formatDateTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export default function Client({
  initialConnectors,
  initialProfiles,
  initialRuns,
  isOrgAdmin,
}: ClientProps) {
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [connectors, setConnectors] =
    useState<DesignConnectorListItem[]>(initialConnectors);
  const [profiles] = useState(initialProfiles);
  const [runs, setRuns] = useState<ClientProps["initialRuns"]>(initialRuns);

  const [form, setForm] = useState({
    provider_key: "fusion",
    credential_profile_id: "",
    display_name: "",
    connection_mode: "bidirectional",
    sync_scope_type: "project",
    sync_scope_external_id: "",
    sync_scope_label: "",
    is_enabled: true,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => profile.provider_key === form.provider_key);
  }, [profiles, form.provider_key]);

  const filteredConnectors = useMemo(() => {
    if (providerFilter === "all") return connectors;
    return connectors.filter((item) => item.provider_key === providerFilter);
  }, [connectors, providerFilter]);

  async function handleCreateConnector(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateMessage(null);
    setActionMessage(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/design-connectors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider_key: form.provider_key,
          credential_profile_id: form.credential_profile_id,
          display_name: form.display_name,
          connection_mode: form.connection_mode,
          sync_scope_type: form.sync_scope_type,
          sync_scope_external_id: form.sync_scope_external_id || null,
          sync_scope_label: form.sync_scope_label || null,
          is_enabled: form.is_enabled,
          settings: {},
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        item?: DesignConnectorListItem;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create design connector.");
      }

      if (payload.item) {
        const createdItem = payload.item as DesignConnectorListItem;
        const profile = profiles.find(
          (p) => p.id === createdItem.credential_profile_id,
        );

        const normalizedItem: DesignConnectorListItem = {
          ...createdItem,
          credential_profile: profile
            ? {
                id: profile.id,
                display_name: profile.display_name,
                provider_key: profile.provider_key,
                auth_mode: profile.auth_mode,
                last_test_status: profile.last_test_status,
              }
            : null,
        };

        setConnectors((current) => [normalizedItem, ...current]);
      }

      setForm((current) => ({
        ...current,
        credential_profile_id: "",
        display_name: "",
        sync_scope_external_id: "",
        sync_scope_label: "",
      }));

      setCreateMessage("Design connector created.");
    } catch (error) {
      setCreateMessage(
        error instanceof Error ? error.message : "Failed to create connector.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleTestConnector(connectorId: string) {
    setActionMessage(null);

    try {
      const response = await fetch(`/api/design-connectors/${connectorId}/test`, {
        method: "POST",
      });

      const payload = (await response.json()) as {
        error?: string;
        ok?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to test connector.");
      }

      setActionMessage(payload.message ?? "Connector test completed.");
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "Failed to test connector.",
      );
    }
  }

  async function handleSyncConnector(connectorId: string) {
    setActionMessage(null);

    try {
      const response = await fetch(`/api/design-connectors/${connectorId}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          run_type: "sync",
          direction: "bidirectional",
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        ok?: boolean;
        sync_run_id?: string;
        status?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to run connector sync.");
      }

           if (payload.sync_run_id) {
        const syncRunId = payload.sync_run_id;
        const newRun: ClientProps["initialRuns"][number] = {
          id: syncRunId,
          provider_key:
            connectors.find((item) => item.id === connectorId)?.provider_key ?? "fusion",
          run_type: "sync",
          direction: "bidirectional",
          status: payload.status ?? "succeeded",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          design_connector_id: connectorId,
        };

        setRuns((current) => [newRun, ...current]);
      }

      setActionMessage(payload.message ?? "Connector sync completed.");
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "Failed to run connector sync.",
      );
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Design Connectors</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage Fusion, SolidWorks, Inventor, and Onshape connector foundations.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <aside className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Filters</h2>

          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium">Provider</label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value as ProviderFilter)}
            >
              <option value="all">All</option>
              {PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold">Profiles</h3>
            <div className="mt-3 space-y-2">
              {profiles.length === 0 ? (
                <p className="text-sm text-gray-500">No design profiles found yet.</p>
              ) : (
                profiles.map((profile) => (
                  <div key={profile.id} className="rounded-xl border p-3 text-sm">
                    <div className="font-medium">{profile.display_name}</div>
                    <div className="text-gray-500">{profile.provider_key}</div>
                    <div className="text-gray-500">
                      auth: {profile.auth_mode ?? "—"}
                    </div>
                    <div className="text-gray-500">
                      last test: {profile.last_test_status ?? "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Connectors</h2>
              <p className="text-sm text-gray-500">
                Current design connector instances for your organization.
              </p>
            </div>
          </div>

          {actionMessage ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              {actionMessage}
            </div>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left">
                  <th className="border-b px-3 py-2 font-semibold">Name</th>
                  <th className="border-b px-3 py-2 font-semibold">Provider</th>
                  <th className="border-b px-3 py-2 font-semibold">Profile</th>
                  <th className="border-b px-3 py-2 font-semibold">Scope</th>
                  <th className="border-b px-3 py-2 font-semibold">Mode</th>
                  <th className="border-b px-3 py-2 font-semibold">Status</th>
                  <th className="border-b px-3 py-2 font-semibold">Last sync</th>
                  <th className="border-b px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredConnectors.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-gray-500" colSpan={8}>
                      No design connectors found.
                    </td>
                  </tr>
                ) : (
                  filteredConnectors.map((connector) => (
                    <tr key={connector.id}>
                      <td className="border-b px-3 py-3">{connector.display_name}</td>
                      <td className="border-b px-3 py-3">{connector.provider_key}</td>
                      <td className="border-b px-3 py-3">
                        {connector.credential_profile?.display_name ?? "—"}
                      </td>
                      <td className="border-b px-3 py-3">
                        <div>{connector.sync_scope_type}</div>
                        <div className="text-xs text-gray-500">
                          {connector.sync_scope_label ??
                            connector.sync_scope_external_id ??
                            "—"}
                        </div>
                      </td>
                      <td className="border-b px-3 py-3">{connector.connection_mode}</td>
                      <td className="border-b px-3 py-3">
                        {connector.last_sync_status ?? "not run"}
                      </td>
                      <td className="border-b px-3 py-3">
                        {formatDateTime(connector.last_sync_at)}
                      </td>
                      <td className="border-b px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                            onClick={() => handleTestConnector(connector.id)}
                            disabled={!isOrgAdmin}
                          >
                            Test
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                            onClick={() => handleSyncConnector(connector.id)}
                            disabled={!isOrgAdmin}
                          >
                            Sync
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold">Recent Runs</h3>
            <div className="mt-3 space-y-2">
              {runs.length === 0 ? (
                <p className="text-sm text-gray-500">No sync runs yet.</p>
              ) : (
                runs.slice(0, 10).map((run) => (
                  <div key={run.id} className="rounded-xl border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">
                        {run.provider_key} · {run.run_type}
                      </div>
                      <div className="text-xs text-gray-500">{run.status}</div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {run.direction} · started {formatDateTime(run.started_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>

        <aside className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Create Connector</h2>
          <p className="mt-1 text-sm text-gray-500">
            Set up a design connector instance using an existing provider profile.
          </p>

          <form className="mt-4 space-y-4" onSubmit={handleCreateConnector}>
            <div>
              <label className="block text-sm font-medium">Provider</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={form.provider_key}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    provider_key: e.target.value,
                    credential_profile_id: "",
                  }))
                }
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Credential Profile</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={form.credential_profile_id}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    credential_profile_id: e.target.value,
                  }))
                }
              >
                <option value="">Select profile</option>
                {filteredProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Display Name</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={form.display_name}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    display_name: e.target.value,
                  }))
                }
                placeholder="Fusion Main Workspace"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Connection Mode</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={form.connection_mode}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    connection_mode: e.target.value,
                  }))
                }
              >
                <option value="bidirectional">bidirectional</option>
                <option value="import_only">import_only</option>
                <option value="export_only">export_only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Scope Type</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={form.sync_scope_type}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    sync_scope_type: e.target.value,
                  }))
                }
              >
                <option value="workspace">workspace</option>
                <option value="project">project</option>
                <option value="folder">folder</option>
                <option value="document">document</option>
                <option value="item">item</option>
                <option value="manual">manual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Scope External ID</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={form.sync_scope_external_id}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    sync_scope_external_id: e.target.value,
                  }))
                }
                placeholder="Optional external scope id"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Scope Label</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={form.sync_scope_label}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    sync_scope_label: e.target.value,
                  }))
                }
                placeholder="Optional friendly label"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_enabled}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    is_enabled: e.target.checked,
                  }))
                }
              />
              Enabled
            </label>

            <button
              type="submit"
              className="w-full rounded-xl border px-4 py-2 text-sm font-medium"
              disabled={!isOrgAdmin || isCreating}
            >
              {isCreating ? "Creating..." : "Create Connector"}
            </button>

            {createMessage ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                {createMessage}
              </div>
            ) : null}
          </form>
        </aside>
      </div>
    </div>
  );
}
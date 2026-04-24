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
      | "organization_id"
      | "provider_key"
      | "display_name"
      | "auth_mode"
      | "client_id"
      | "last_tested_at"
      | "last_test_status"
      | "last_test_error"
      | "created_at"
      | "updated_at"
      | "token_expires_at"
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

type ProfileListItem = ClientProps["initialProfiles"][number];
type RunListItem = ClientProps["initialRuns"][number];

const PROVIDERS = [
  { value: "fusion", label: "Fusion" },
  { value: "solidworks", label: "SolidWorks" },
  { value: "inventor", label: "Inventor" },
  { value: "onshape", label: "Onshape" },
] as const;

const AUTH_MODE_OPTIONS = [
  { value: "oauth_authorization_code", label: "OAuth Authorization Code" },
  { value: "client_credentials", label: "Client Credentials" },
  { value: "api_token", label: "API Token" },
] as const;

type ProviderFilter = "all" | (typeof PROVIDERS)[number]["value"];

function formatDateTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function providerLabel(providerKey: string) {
  return PROVIDERS.find((item) => item.value === providerKey)?.label ?? providerKey;
}

function authModeLabel(authMode: string | null) {
  if (!authMode) return "—";
  return (
    AUTH_MODE_OPTIONS.find((item) => item.value === authMode)?.label ?? authMode
  );
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
  const [profiles, setProfiles] = useState<ProfileListItem[]>(initialProfiles);
  const [runs, setRuns] = useState<RunListItem[]>(initialRuns);

  const [profileForm, setProfileForm] = useState({
    provider_key: "fusion",
    display_name: "",
    auth_mode: "oauth_authorization_code",
    client_id: "",
  });
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [connectorForm, setConnectorForm] = useState({
    provider_key: "fusion",
    credential_profile_id: "",
    display_name: "",
    connection_mode: "bidirectional",
    sync_scope_type: "project",
    sync_scope_external_id: "",
    sync_scope_label: "",
    is_enabled: true,
  });

  const [isCreatingConnector, setIsCreatingConnector] = useState(false);
  const [connectorMessage, setConnectorMessage] = useState<string | null>(null);

  const filteredProfilesForConnector = useMemo(() => {
    return profiles.filter(
      (profile) => profile.provider_key === connectorForm.provider_key,
    );
  }, [profiles, connectorForm.provider_key]);

  const filteredConnectors = useMemo(() => {
    if (providerFilter === "all") return connectors;
    return connectors.filter((item) => item.provider_key === providerFilter);
  }, [connectors, providerFilter]);

  function resetProfileForm() {
    setProfileForm({
      provider_key: "fusion",
      display_name: "",
      auth_mode: "oauth_authorization_code",
      client_id: "",
    });
    setEditingProfileId(null);
  }

  function startProfileEdit(profile: ProfileListItem) {
    setProfileMessage(null);
    setEditingProfileId(profile.id);
    setProfileForm({
      provider_key: profile.provider_key,
      display_name: profile.display_name,
      auth_mode: profile.auth_mode ?? "oauth_authorization_code",
      client_id: profile.client_id ?? "",
    });
  }

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMessage(null);
    setIsSavingProfile(true);

    try {
      const isEditing = Boolean(editingProfileId);

      const response = await fetch(
        isEditing
          ? `/api/design-connector-profiles/${editingProfileId}`
          : "/api/design-connector-profiles",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider_key: profileForm.provider_key,
            display_name: profileForm.display_name,
            auth_mode: profileForm.auth_mode,
            client_id: profileForm.client_id || null,
          }),
        },
      );

      const payload = (await response.json()) as {
        error?: string;
        item?: ProfileListItem;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save profile.");
      }

      if (payload.item) {
        if (isEditing) {
          setProfiles((current) =>
            current.map((profile) =>
              profile.id === payload.item?.id ? payload.item! : profile,
            ),
          );
          setProfileMessage("Profile updated.");
        } else {
          setProfiles((current) =>
            [...current, payload.item!].sort((a, b) => {
              if (a.provider_key !== b.provider_key) {
                return a.provider_key.localeCompare(b.provider_key);
              }
              return a.display_name.localeCompare(b.display_name);
            }),
          );
          setProfileMessage("Profile created.");
        }
      }

      resetProfileForm();
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "Failed to save profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleTestProfile(profileId: string) {
    setProfileMessage(null);

    try {
      const response = await fetch(
        `/api/design-connector-profiles/${profileId}/test`,
        {
          method: "POST",
        },
      );

      const payload = (await response.json()) as {
        error?: string;
        ok?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to test profile.");
      }

      const testedAt = new Date().toISOString();

      setProfiles((current) =>
        current.map((profile) =>
          profile.id === profileId
            ? {
                ...profile,
                last_tested_at: testedAt,
                last_test_status: payload.ok ? "succeeded" : "failed",
                last_test_error: payload.ok ? null : payload.message ?? null,
              }
            : profile,
        ),
      );

      setProfileMessage(payload.message ?? "Profile test completed.");
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "Failed to test profile.",
      );
    }
  }

  async function handleDeleteProfile(profileId: string) {
    const confirmed = window.confirm(
      "Delete this profile? Connectors using it must be removed first.",
    );

    if (!confirmed) return;

    setProfileMessage(null);

    try {
      const response = await fetch(`/api/design-connector-profiles/${profileId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as {
        error?: string;
        ok?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete profile.");
      }

      setProfiles((current) => current.filter((profile) => profile.id !== profileId));

      if (editingProfileId === profileId) {
        resetProfileForm();
      }

      setProfileMessage(payload.message ?? "Profile deleted.");
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "Failed to delete profile.",
      );
    }
  }

  async function handleCreateConnector(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setConnectorMessage(null);
    setIsCreatingConnector(true);

    try {
      const response = await fetch("/api/design-connectors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider_key: connectorForm.provider_key,
          credential_profile_id: connectorForm.credential_profile_id,
          display_name: connectorForm.display_name,
          connection_mode: connectorForm.connection_mode,
          sync_scope_type: connectorForm.sync_scope_type,
          sync_scope_external_id: connectorForm.sync_scope_external_id || null,
          sync_scope_label: connectorForm.sync_scope_label || null,
          is_enabled: connectorForm.is_enabled,
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
        const profile = profiles.find(
          (p) => p.id === payload.item?.credential_profile_id,
        );

        const normalizedItem: DesignConnectorListItem = {
          ...(payload.item as DesignConnectorListItem),
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

      setConnectorForm((current) => ({
        ...current,
        credential_profile_id: "",
        display_name: "",
        sync_scope_external_id: "",
        sync_scope_label: "",
      }));

      setConnectorMessage("Design connector created.");
    } catch (error) {
      setConnectorMessage(
        error instanceof Error ? error.message : "Failed to create connector.",
      );
    } finally {
      setIsCreatingConnector(false);
    }
  }

  async function handleTestConnector(connectorId: string) {
    setConnectorMessage(null);

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

      setConnectorMessage(payload.message ?? "Connector test completed.");
    } catch (error) {
      setConnectorMessage(
        error instanceof Error ? error.message : "Failed to test connector.",
      );
    }
  }

  async function handleSyncConnector(connectorId: string) {
    setConnectorMessage(null);

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
        const newRun: RunListItem = {
          id: payload.sync_run_id,
          provider_key:
            connectors.find((item) => item.id === connectorId)?.provider_key ??
            "fusion",
          run_type: "sync",
          direction: "bidirectional",
          status: payload.status ?? "succeeded",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          design_connector_id: connectorId,
        };

        setRuns((current) => [newRun, ...current]);
      }

      setConnectorMessage(payload.message ?? "Connector sync completed.");
    } catch (error) {
      setConnectorMessage(
        error instanceof Error ? error.message : "Failed to run connector sync.",
      );
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Design Connectors</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage connector profiles and bidirectional design connector instances.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_380px]">
        <aside className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Profile Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            Create and maintain reusable profile definitions for supported CAD systems.
          </p>

          <form className="mt-4 space-y-4" onSubmit={handleSaveProfile}>
            <div>
              <label className="block text-sm font-medium">Provider</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={profileForm.provider_key}
                onChange={(e) =>
                  setProfileForm((current) => ({
                    ...current,
                    provider_key: e.target.value,
                  }))
                }
                disabled={Boolean(editingProfileId)}
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Display Name</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={profileForm.display_name}
                onChange={(e) =>
                  setProfileForm((current) => ({
                    ...current,
                    display_name: e.target.value,
                  }))
                }
                placeholder="Fusion Production Profile"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Auth Mode</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={profileForm.auth_mode}
                onChange={(e) =>
                  setProfileForm((current) => ({
                    ...current,
                    auth_mode: e.target.value,
                  }))
                }
              >
                {AUTH_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Client ID</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={profileForm.client_id}
                onChange={(e) =>
                  setProfileForm((current) => ({
                    ...current,
                    client_id: e.target.value,
                  }))
                }
                placeholder="Optional for first-phase testing"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl border px-4 py-2 text-sm font-medium"
                disabled={!isOrgAdmin || isSavingProfile}
              >
                {isSavingProfile
                  ? editingProfileId
                    ? "Updating..."
                    : "Creating..."
                  : editingProfileId
                  ? "Update Profile"
                  : "Create Profile"}
              </button>

              {editingProfileId ? (
                <button
                  type="button"
                  className="rounded-xl border px-4 py-2 text-sm font-medium"
                  onClick={resetProfileForm}
                >
                  Cancel
                </button>
              ) : null}
            </div>

            {profileMessage ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                {profileMessage}
              </div>
            ) : null}
          </form>

          <div className="mt-6">
            <h3 className="text-sm font-semibold">Saved Profiles</h3>
            <div className="mt-3 space-y-3">
              {profiles.length === 0 ? (
                <p className="text-sm text-gray-500">No design profiles found yet.</p>
              ) : (
                profiles.map((profile) => (
                  <div key={profile.id} className="rounded-xl border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{profile.display_name}</div>
                        <div className="text-gray-500">
                          {providerLabel(profile.provider_key)}
                        </div>
                        <div className="text-gray-500">
                          auth: {authModeLabel(profile.auth_mode)}
                        </div>
                        <div className="text-gray-500">
                          client id: {profile.client_id || "—"}
                        </div>
                        <div className="text-gray-500">
                          last test: {profile.last_test_status ?? "—"}
                        </div>
                        <div className="text-gray-500">
                          tested at: {formatDateTime(profile.last_tested_at)}
                        </div>
                        {profile.last_test_error ? (
                          <div className="mt-1 text-red-600">
                            error: {profile.last_test_error}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                          onClick={() => startProfileEdit(profile)}
                          disabled={!isOrgAdmin}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                          onClick={() => handleTestProfile(profile.id)}
                          disabled={!isOrgAdmin}
                        >
                          Test
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                          onClick={() => handleDeleteProfile(profile.id)}
                          disabled={!isOrgAdmin}
                        >
                          Delete
                        </button>
                      </div>
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

            <div className="w-full max-w-[180px]">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Filter
              </label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value as ProviderFilter)}
              >
                <option value="all">All</option>
                {PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {connectorMessage ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              {connectorMessage}
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
                      <td className="border-b px-3 py-3">
                        {providerLabel(connector.provider_key)}
                      </td>
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
                        {providerLabel(run.provider_key)} · {run.run_type}
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
            Set up a design connector instance using an existing profile.
          </p>

          <form className="mt-4 space-y-4" onSubmit={handleCreateConnector}>
            <div>
              <label className="block text-sm font-medium">Provider</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={connectorForm.provider_key}
                onChange={(e) =>
                  setConnectorForm((current) => ({
                    ...current,
                    provider_key: e.target.value,
                    credential_profile_id: "",
                  }))
                }
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Credential Profile</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={connectorForm.credential_profile_id}
                onChange={(e) =>
                  setConnectorForm((current) => ({
                    ...current,
                    credential_profile_id: e.target.value,
                  }))
                }
              >
                <option value="">Select profile</option>
                {filteredProfilesForConnector.map((profile) => (
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
                value={connectorForm.display_name}
                onChange={(e) =>
                  setConnectorForm((current) => ({
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
                value={connectorForm.connection_mode}
                onChange={(e) =>
                  setConnectorForm((current) => ({
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
                value={connectorForm.sync_scope_type}
                onChange={(e) =>
                  setConnectorForm((current) => ({
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
                value={connectorForm.sync_scope_external_id}
                onChange={(e) =>
                  setConnectorForm((current) => ({
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
                value={connectorForm.sync_scope_label}
                onChange={(e) =>
                  setConnectorForm((current) => ({
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
                checked={connectorForm.is_enabled}
                onChange={(e) =>
                  setConnectorForm((current) => ({
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
              disabled={!isOrgAdmin || isCreatingConnector}
            >
              {isCreatingConnector ? "Creating..." : "Create Connector"}
            </button>

            {connectorMessage ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                {connectorMessage}
              </div>
            ) : null}
          </form>
        </aside>
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  InternalConnectorResource,
  InternalResourceConnection,
  InternalResourceConnectionsData,
} from "./types";

type Props = {
  data: InternalResourceConnectionsData;
};

const providerOptions = [
  "formlabs",
  "ultimaker",
  "markforged",
  "stratasys",
  "hp",
  "mtconnect",
  "opc_ua",
  "manual",
  "other",
] as const;

const connectionModeOptions = [
  "api_key",
  "oauth",
  "agent_url",
  "manual",
] as const;

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusBadgeClasses(
  status: InternalResourceConnection["lastSyncStatus"],
) {
  switch (status) {
    case "ok":
      return "bg-emerald-100 text-emerald-700";
    case "error":
      return "bg-rose-100 text-rose-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "disabled":
      return "bg-zinc-200 text-zinc-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function Client({ data }: Props) {
  const router = useRouter();
  const [openResourceId, setOpenResourceId] = useState<string | null>(null);

  const connectionsByResourceId = useMemo(() => {
    const map = new Map<string, InternalResourceConnection>();

    for (const connection of data.connections) {
      if (connection.resourceId) {
        map.set(connection.resourceId, connection);
      }
    }

    return map;
  }, [data.connections]);

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Internal connectors
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              Machine integrations
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Attach live machine connectors to internal resources so scheduling can
              use connected status instead of only manual updates.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/internal-manufacturing"
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Back to overview
            </Link>
            <Link
              href="/dashboard/internal-manufacturing/setup"
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Open setup
            </Link>
            <Link
              href="/dashboard/internal-manufacturing/schedule"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Open schedule
            </Link>
          </div>
        </div>

        {data.errors.length > 0 ? (
          <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
            <div className="text-sm font-semibold text-amber-800">
              Some connector data could not be loaded completely.
            </div>
            <div className="mt-2 space-y-1 text-sm text-amber-700">
              {data.errors.map((error) => (
                <div key={error}>{error}</div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard label="Resources" value={data.resources.length} />
          <StatCard label="Connected resources" value={data.connections.length} />
          <StatCard
            label="Active sync"
            value={data.connections.filter((connection) => connection.syncEnabled).length}
          />
        </div>
      </section>

      <section className="space-y-4">
        {data.resources.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-slate-600">
            No internal resources exist yet. Add resources first, then attach connectors.
          </div>
        ) : (
          data.resources.map((resource) => {
            const existingConnection = connectionsByResourceId.get(resource.id) ?? null;

            return (
              <div
                key={resource.id}
                className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-slate-950">
                        {resource.name}
                      </h3>
                      <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                        {formatLabel(resource.resourceType)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                        {formatLabel(resource.serviceDomain)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-1 text-sm text-slate-600">
                      <div>Status: {formatLabel(resource.currentStatus)}</div>
                      <div>Location: {resource.locationLabel || "—"}</div>
                      <div>Active: {resource.active ? "Yes" : "No"}</div>
                    </div>
                  </div>

                  <div className="min-w-[280px]">
                    {existingConnection ? (
                      <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-950">
                              {existingConnection.displayName}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                              {formatLabel(existingConnection.providerKey)} ·{" "}
                              {formatLabel(existingConnection.connectionMode)}
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
                              existingConnection.lastSyncStatus,
                            )}`}
                          >
                            {existingConnection.lastSyncStatus || "unknown"}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-1 text-xs text-slate-500">
                          <div>
                            External resource:{" "}
                            {existingConnection.externalResourceId || "—"}
                          </div>
                          <div>
                            Last sync: {formatDateTime(existingConnection.lastSyncAt)}
                          </div>
                          <div>
                            Sync enabled: {existingConnection.syncEnabled ? "Yes" : "No"}
                          </div>
                        </div>

                        {existingConnection.lastError ? (
                          <div className="mt-3 rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                            {existingConnection.lastError}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-[20px] border border-dashed border-zinc-300 bg-[#fafaf9] p-4 text-sm text-slate-600">
                        No connector attached yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenResourceId((current) =>
                        current === resource.id ? null : resource.id,
                      )
                    }
                    className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
                  >
                    {openResourceId === resource.id
                      ? "Close connector"
                      : existingConnection
                        ? "Manage connector"
                        : "Add connector"}
                  </button>
                </div>

                {openResourceId === resource.id ? (
                  <div className="mt-5">
                    <ConnectorEditorCard
                      resource={resource}
                      existingConnection={existingConnection}
                      onSaved={() => router.refresh()}
                      onDeleted={() => router.refresh()}
                    />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function ConnectorEditorCard({
  resource,
  existingConnection,
  onSaved,
  onDeleted,
}: {
  resource: InternalConnectorResource;
  existingConnection: InternalResourceConnection | null;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [providerKey, setProviderKey] = useState<
    InternalResourceConnection["providerKey"]
  >(existingConnection?.providerKey ?? "formlabs");
  const [connectionMode, setConnectionMode] = useState<
    InternalResourceConnection["connectionMode"]
  >(existingConnection?.connectionMode ?? "api_key");
  const [displayName, setDisplayName] = useState(
    existingConnection?.displayName ?? `${resource.name} Connector`,
  );
  const [vaultSecretName, setVaultSecretName] = useState(
    existingConnection?.vaultSecretName ?? "",
  );
  const [vaultSecretId, setVaultSecretId] = useState(
    existingConnection?.vaultSecretId ?? "",
  );
  const [baseUrl, setBaseUrl] = useState(existingConnection?.baseUrl ?? "");
  const [externalResourceId, setExternalResourceId] = useState(
    existingConnection?.externalResourceId ?? "",
  );
  const [syncEnabled, setSyncEnabled] = useState(
    existingConnection?.syncEnabled ?? true,
  );
  const [metadataText, setMetadataText] = useState(
    JSON.stringify(existingConnection?.metadata ?? {}, null, 2),
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      let metadata: Record<string, unknown> = {};

      try {
        metadata = metadataText.trim()
          ? (JSON.parse(metadataText) as Record<string, unknown>)
          : {};
      } catch {
        throw new Error("Metadata must be valid JSON.");
      }

      const url = existingConnection
        ? `/api/internal-manufacturing/resource-connections/${existingConnection.id}`
        : "/api/internal-manufacturing/resource-connections";

      const method = existingConnection ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceId: resource.id,
          providerKey,
          connectionMode,
          displayName,
          vaultSecretName: vaultSecretName || null,
          vaultSecretId: vaultSecretId || null,
          baseUrl: baseUrl || null,
          externalResourceId: externalResourceId || null,
          syncEnabled,
          metadata,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save connector.");
      }

      setInfo(existingConnection ? "Connector updated." : "Connector created.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save connector.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!existingConnection) {
      setError("Save the connector first before testing.");
      return;
    }

    setTesting(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(
        `/api/internal-manufacturing/resource-connections/${existingConnection.id}/test`,
        {
          method: "POST",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to test connector.");
      }

      setInfo(payload.message || "Connector test finished.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test connector.");
    } finally {
      setTesting(false);
    }
  }

  async function handleSync() {
    if (!existingConnection) {
      setError("Save the connector first before syncing.");
      return;
    }

    setSyncing(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(
        `/api/internal-manufacturing/resource-connections/${existingConnection.id}/sync`,
        {
          method: "POST",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to sync connector.");
      }

      setInfo(
        `Sync completed. Resource status set to ${payload.resolvedStatus ?? "updated"}.`,
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync connector.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!existingConnection) {
      setError("Connector does not exist yet.");
      return;
    }

    setDeleting(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(
        `/api/internal-manufacturing/resource-connections/${existingConnection.id}`,
        {
          method: "DELETE",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete connector.");
      }

      setInfo("Connector deleted.");
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete connector.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="space-y-4 rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-6"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Provider">
          <select
            value={providerKey}
            onChange={(event) =>
              setProviderKey(event.target.value as InternalResourceConnection["providerKey"])
            }
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {providerOptions.map((value) => (
              <option key={value} value={value}>
                {formatLabel(value)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Connection mode">
          <select
            value={connectionMode}
            onChange={(event) =>
              setConnectionMode(
                event.target.value as InternalResourceConnection["connectionMode"],
              )
            }
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {connectionModeOptions.map((value) => (
              <option key={value} value={value}>
                {formatLabel(value)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Display name">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </Field>

        <Field label="External resource ID">
          <input
            value={externalResourceId}
            onChange={(event) => setExternalResourceId(event.target.value)}
            placeholder="Remote machine/printer ID"
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Vault secret name">
          <input
            value={vaultSecretName}
            onChange={(event) => setVaultSecretName(event.target.value)}
            placeholder="Secret reference name"
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </Field>

        <Field label="Vault secret ID">
          <input
            value={vaultSecretId}
            onChange={(event) => setVaultSecretId(event.target.value)}
            placeholder="Secret reference ID"
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </Field>

        <Field label="Base URL">
          <input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="Local agent or API base URL"
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </Field>

        <div className="flex items-end">
          <label className="inline-flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={syncEnabled}
              onChange={(event) => setSyncEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Sync enabled
          </label>
        </div>
      </div>

      <div>
        <Field label="Metadata JSON">
          <textarea
            value={metadataText}
            onChange={(event) => setMetadataText(event.target.value)}
            rows={6}
            className="w-full rounded-[20px] border border-zinc-300 bg-white px-4 py-3 font-mono text-sm text-slate-950 outline-none"
            placeholder={`{\n  "workspaceId": "",\n  "siteId": "",\n  "simulatedStatus": "idle"\n}`}
          />
        </Field>
      </div>

      {error ? (
        <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {info}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving..." : existingConnection ? "Save connector" : "Create connector"}
        </button>

        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:opacity-60"
        >
          {testing ? "Testing..." : "Test connection"}
        </button>

        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:opacity-60"
        >
          {syncing ? "Syncing..." : "Sync now"}
        </button>

        {existingConnection ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete connector"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
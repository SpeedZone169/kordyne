"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { InternalManufacturingCapability } from "../../types";
import type {
  FormlabsDiscoveredPrinter,
  InternalConnectorCredentialProfile,
  InternalConnectorProviderKey,
  InternalConnectorResource,
  InternalResourceConnection,
  MarkforgedDiscoveredPrinter,
  StratasysDiscoveredPrinter,
  UltimakerDiscoveredPrinter,
} from "../types";
import {
  type DiscoveredMachine,
  connectionModeOptions,
  createDefaultDisplayName,
  formatDateTime,
  formatLabel,
  formatProviderLabel,
  getProviderPreset,
  getStatusBadgeClasses,
  getSyncBadgeClasses,
  inputClasses,
  providerOptions,
} from "./connectorUi";
import {
  createAutoMetadata,
  getDiscoveredMachineId,
  getDiscoveredMachineModel,
  getDiscoveredMachineName,
  getDiscoveredMachineTechnology,
  inferCapabilitySeed,
} from "./discoveryHelpers";
import DiscoveryResultsPanel from "./DiscoveryResultsPanel";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function MachineActionPanel({
  resource,
  existingConnection,
  resources,
  credentialProfiles,
  capabilities,
  selectedResourceId,
  onSelectedResourceChange,
  defaultOrganizationId,
  onSaved,
  onDeleted,
}: {
  resource: InternalConnectorResource | null;
  existingConnection: InternalResourceConnection | null;
  resources: InternalConnectorResource[];
  credentialProfiles: InternalConnectorCredentialProfile[];
  capabilities: InternalManufacturingCapability[];
  selectedResourceId: string | null;
  onSelectedResourceChange: (resourceId: string) => void;
  defaultOrganizationId: string | null;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [providerKey, setProviderKey] = useState<InternalConnectorProviderKey>(
    existingConnection?.providerKey ?? "formlabs",
  );
  const [connectionMode, setConnectionMode] = useState<
    InternalResourceConnection["connectionMode"]
  >(existingConnection?.connectionMode ?? getProviderPreset("formlabs").connectionMode);
  const [displayName, setDisplayName] = useState(
    existingConnection?.displayName ?? `${resource?.name ?? "Machine"} Connector`,
  );
  const [credentialProfileId, setCredentialProfileId] = useState(
    existingConnection?.credentialProfileId ??
      credentialProfiles.find(
        (profile) =>
          profile.providerKey === (existingConnection?.providerKey ?? "formlabs"),
      )?.id ??
      "",
  );
  const [baseUrl, setBaseUrl] = useState(existingConnection?.baseUrl ?? "");
  const [externalResourceId, setExternalResourceId] = useState(
    existingConnection?.externalResourceId ?? "",
  );
  const [syncEnabled, setSyncEnabled] = useState(
    existingConnection?.syncEnabled ?? true,
  );
  const [vaultSecretName, setVaultSecretName] = useState(
    existingConnection?.vaultSecretName ?? "",
  );
  const [vaultSecretId, setVaultSecretId] = useState(
    existingConnection?.vaultSecretId ?? "",
  );
  const [structuredMetadata, setStructuredMetadata] = useState<Record<string, unknown>>(
    existingConnection?.metadata ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredMachines, setDiscoveredMachines] = useState<DiscoveredMachine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [creatingFromDiscoveryId, setCreatingFromDiscoveryId] = useState<string | null>(null);
  const [selectedDiscoveredIds, setSelectedDiscoveredIds] = useState<string[]>([]);
  const [bulkCreating, setBulkCreating] = useState<
    null | "resources" | "resources_capabilities" | "resources_connectors" | "full"
  >(null);

  const preset = getProviderPreset(providerKey);

  const scopedProfiles = useMemo(
    () => credentialProfiles.filter((profile) => profile.providerKey === providerKey),
    [credentialProfiles, providerKey],
  );

  useEffect(() => {
    const initialProvider = existingConnection?.providerKey ?? "formlabs";
    const initialPreset = getProviderPreset(initialProvider);

    setProviderKey(initialProvider);
    setConnectionMode(
      existingConnection?.connectionMode ?? initialPreset.connectionMode,
    );
    setDisplayName(
      existingConnection?.displayName ?? `${resource?.name ?? "Machine"} Connector`,
    );
    setCredentialProfileId(
      existingConnection?.credentialProfileId ??
        credentialProfiles.find((profile) => profile.providerKey === initialProvider)
          ?.id ??
        "",
    );
    setBaseUrl(existingConnection?.baseUrl ?? initialPreset.defaultBaseUrl);
    setExternalResourceId(existingConnection?.externalResourceId ?? "");
    setSyncEnabled(existingConnection?.syncEnabled ?? true);
    setVaultSecretName(existingConnection?.vaultSecretName ?? "");
    setVaultSecretId(existingConnection?.vaultSecretId ?? "");
    setStructuredMetadata(existingConnection?.metadata ?? {});
    setDiscoveredMachines([]);
    setSelectedDiscoveredIds([]);
    setError(null);
    setInfo(null);
  }, [credentialProfiles, existingConnection, resource]);

  useEffect(() => {
    const nextPreset = getProviderPreset(providerKey);

    setConnectionMode(nextPreset.connectionMode);

    if (!existingConnection || existingConnection.providerKey !== providerKey) {
      setBaseUrl(nextPreset.defaultBaseUrl);
      setExternalResourceId("");
      setVaultSecretName("");
      setVaultSecretId("");
      setDiscoveredMachines([]);
      setSelectedDiscoveredIds([]);
      setStructuredMetadata({});
      setDisplayName(createDefaultDisplayName(resource, null, providerKey));
    }

    setCredentialProfileId((current) => {
      if (
        current &&
        credentialProfiles.some(
          (profile) => profile.id === current && profile.providerKey === providerKey,
        )
      ) {
        return current;
      }

      return (
        credentialProfiles.find((profile) => profile.providerKey === providerKey)?.id ??
        ""
      );
    });
  }, [credentialProfiles, existingConnection, providerKey, resource]);

  function isDiscoveredSelected(machine: DiscoveredMachine) {
    return selectedDiscoveredIds.includes(getDiscoveredMachineId(machine));
  }

  function toggleDiscoveredSelected(machine: DiscoveredMachine) {
    const id = getDiscoveredMachineId(machine);

    setSelectedDiscoveredIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function buildBulkDiscoveryItems() {
    return discoveredMachines
      .filter((machine) => selectedDiscoveredIds.includes(getDiscoveredMachineId(machine)))
      .map((machine) => ({
        providerKey: machine.providerKey,
        machineName: getDiscoveredMachineName(machine),
        externalResourceId: getDiscoveredMachineId(machine),
        model: getDiscoveredMachineModel(machine),
        technology: getDiscoveredMachineTechnology(machine),
        locationLabel:
          machine.providerKey === "markforged" || machine.providerKey === "stratasys"
            ? machine.item.locationName || null
            : null,
        metadata: createAutoMetadata(machine),
      }));
  }

  async function handleCreateFromDiscoveredMachine(
    machine: DiscoveredMachine,
    mode:
      | "resource_only"
      | "resource_and_capability"
      | "resource_and_connector"
      | "resource_capability_and_connector",
  ) {
    if (!defaultOrganizationId) {
      setError("No customer organization context was found.");
      return;
    }

    setCreatingFromDiscoveryId(getDiscoveredMachineId(machine));
    setError(null);
    setInfo(null);

    try {
      const capabilitySeed = inferCapabilitySeed(machine);
      const selectedProfileId =
        preset.requiresCredentialProfile ? credentialProfileId || null : null;

      const response = await fetch(
        "/api/internal-manufacturing/resources/from-discovery",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organizationId: defaultOrganizationId,
            providerKey: machine.providerKey,
            machineName: getDiscoveredMachineName(machine),
            externalResourceId: getDiscoveredMachineId(machine),
            model: getDiscoveredMachineModel(machine),
            technology: getDiscoveredMachineTechnology(machine),
            locationLabel:
              machine.providerKey === "markforged" || machine.providerKey === "stratasys"
                ? machine.item.locationName || null
                : null,
            metadata: createAutoMetadata(machine),
            createCapability:
              mode === "resource_and_capability" ||
              mode === "resource_capability_and_connector"
                ? {
                    code: capabilitySeed.code,
                    name: capabilitySeed.name,
                    serviceDomain: capabilitySeed.serviceDomain,
                    description: `Auto-created from ${formatProviderLabel(machine.providerKey)} machine discovery.`,
                  }
                : null,
            createConnection:
              mode === "resource_and_connector" ||
              mode === "resource_capability_and_connector"
                ? {
                    displayName: `${getDiscoveredMachineName(machine)} Connector`,
                    credentialProfileId: selectedProfileId,
                    baseUrl: baseUrl || null,
                    syncEnabled: true,
                    vaultSecretName:
                      preset.allowLegacyFallback ? vaultSecretName || null : null,
                    vaultSecretId:
                      preset.allowLegacyFallback ? vaultSecretId || null : null,
                  }
                : null,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create resource from discovery.");
      }

      if (mode === "resource_capability_and_connector") {
        setInfo("Machine resource, suggested capability, and connector created.");
      } else if (mode === "resource_and_connector") {
        setInfo("Machine resource and connector created.");
      } else if (mode === "resource_and_capability") {
        setInfo("Machine resource and suggested capability created.");
      } else {
        setInfo("Machine resource created from discovery.");
      }

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create resource from discovery.",
      );
    } finally {
      setCreatingFromDiscoveryId(null);
    }
  }

  async function handleBulkCreate(
    mode: "resources" | "resources_capabilities" | "resources_connectors" | "full",
  ) {
    if (!defaultOrganizationId) {
      setError("No customer organization context was found.");
      return;
    }

    const items = buildBulkDiscoveryItems();

    if (items.length === 0) {
      setError("Select at least one discovered machine first.");
      return;
    }

    setBulkCreating(mode);
    setError(null);
    setInfo(null);

    try {
      const selectedProfileId =
        preset.requiresCredentialProfile ? credentialProfileId || null : null;

      const response = await fetch(
        "/api/internal-manufacturing/resources/from-discovery/bulk",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organizationId: defaultOrganizationId,
            items,
            createCapabilities:
              mode === "resources_capabilities" || mode === "full",
            createConnectors:
              mode === "resources_connectors" || mode === "full",
            credentialProfileId: selectedProfileId,
            baseUrl: baseUrl || null,
            vaultSecretName:
              preset.allowLegacyFallback ? vaultSecretName || null : null,
            vaultSecretId:
              preset.allowLegacyFallback ? vaultSecretId || null : null,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok && response.status !== 207) {
        throw new Error(payload.error || "Bulk onboarding failed.");
      }

      const successCount =
        typeof payload.successCount === "number" ? payload.successCount : 0;
      const errorCount =
        typeof payload.errorCount === "number" ? payload.errorCount : 0;

      if (errorCount > 0) {
        setInfo(
          `Bulk onboarding finished. ${successCount} succeeded, ${errorCount} failed.`,
        );
      } else if (mode === "full") {
        setInfo(`Created ${successCount} resources, capabilities, and connectors.`);
      } else if (mode === "resources_connectors") {
        setInfo(`Created ${successCount} resources and connectors.`);
      } else if (mode === "resources_capabilities") {
        setInfo(`Created ${successCount} resources and capabilities.`);
      } else {
        setInfo(`Created ${successCount} resources.`);
      }

      setSelectedDiscoveredIds([]);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk onboarding failed.");
    } finally {
      setBulkCreating(null);
    }
  }

  async function handleDiscoverMachines() {
    if (!credentialProfileId) {
      setError(`Select a saved ${preset.label} credential profile first.`);
      return;
    }

    setDiscovering(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(
        `/api/internal-manufacturing/connector-profiles/${credentialProfileId}/discover-printers`,
        { method: "POST" },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || payload.message || "Failed to discover machines.");
      }

      const rawItems: unknown[] = Array.isArray(payload.printers) ? payload.printers : [];

      const normalized: DiscoveredMachine[] =
        providerKey === "ultimaker"
          ? rawItems.map((item) => ({
              providerKey: "ultimaker" as const,
              item: item as UltimakerDiscoveredPrinter,
            }))
          : providerKey === "markforged"
            ? rawItems.map((item) => ({
                providerKey: "markforged" as const,
                item: item as MarkforgedDiscoveredPrinter,
              }))
            : providerKey === "stratasys"
              ? rawItems.map((item) => ({
                  providerKey: "stratasys" as const,
                  item: item as StratasysDiscoveredPrinter,
                }))
              : rawItems.map((item) => ({
                  providerKey: "formlabs" as const,
                  item: item as FormlabsDiscoveredPrinter,
                }));

      setDiscoveredMachines(normalized);
      setSelectedDiscoveredIds([]);
      setInfo(
        normalized.length > 0
          ? `Loaded ${normalized.length} machine(s).`
          : "Credentials are valid, but no machines were returned.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discover machines.");
    } finally {
      setDiscovering(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setInfo(null);

    if (!resource) {
      setSaving(false);
      setError("Select a machine first.");
      return;
    }

    try {
      const url = existingConnection
        ? `/api/internal-manufacturing/resource-connections/${existingConnection.id}`
        : "/api/internal-manufacturing/resource-connections";

      const method = existingConnection ? "PATCH" : "POST";

      const body = {
        resourceId: resource.id,
        providerKey,
        connectionMode,
        displayName,
        vaultSecretName: preset.allowLegacyFallback ? vaultSecretName || null : null,
        vaultSecretId: preset.allowLegacyFallback ? vaultSecretId || null : null,
        credentialProfileId: preset.requiresCredentialProfile ? credentialProfileId || null : null,
        baseUrl: baseUrl || null,
        externalResourceId: externalResourceId || null,
        syncEnabled,
        metadata: structuredMetadata,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        { method: "POST" },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || payload.message || "Failed to test connector.");
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
        { method: "POST" },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || payload.message || "Failed to sync connector.");
      }

      setInfo(
        payload.status
          ? `Sync completed. Resource status set to ${payload.status}.`
          : "Sync completed.",
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
        { method: "DELETE" },
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

  const showConnectionModeSelector =
    !["formlabs", "ultimaker", "markforged", "stratasys", "hp"].includes(providerKey);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Connector workspace
        </div>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Selected machine
        </h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Discover provider machines first, then attach them cleanly to internal resources.
        </p>
      </div>

      <form onSubmit={handleSave} className="mt-5 space-y-4">
        <Field label="Internal resource">
          <select
            value={selectedResourceId ?? ""}
            onChange={(event) => onSelectedResourceChange(event.target.value)}
            className={inputClasses()}
          >
            {resources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>

        {resource ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">{resource.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatLabel(resource.resourceType)} · {formatLabel(resource.serviceDomain)}
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-medium ${getStatusBadgeClasses(
                  resource.currentStatus,
                )}`}
              >
                {formatLabel(resource.currentStatus)}
              </span>
            </div>

            <div className="mt-3 grid gap-1 text-xs text-slate-500">
              <div>Location: {resource.locationLabel || "—"}</div>
              <div>Timezone: {resource.timezone || "—"}</div>
              <div>Status source: {formatLabel(resource.statusSource)}</div>
              <div>Latest update: {formatDateTime(resource.latestStatusEvent?.effectiveAt)}</div>
            </div>
          </div>
        ) : null}

        <Field label="Provider">
          <select
            value={providerKey}
            onChange={(event) =>
              setProviderKey(event.target.value as InternalConnectorProviderKey)
            }
            className={inputClasses()}
          >
            {providerOptions.map((value) => (
              <option key={value} value={value}>
                {formatProviderLabel(value)}
              </option>
            ))}
          </select>
        </Field>

        <div
          className={`grid gap-4 ${
            showConnectionModeSelector ? "md:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {showConnectionModeSelector ? (
            <Field label="Connection mode">
              <select
                value={connectionMode}
                onChange={(event) =>
                  setConnectionMode(
                    event.target.value as InternalResourceConnection["connectionMode"],
                  )
                }
                className={inputClasses()}
              >
                {connectionModeOptions.map((value) => (
                  <option key={value} value={value}>
                    {formatLabel(value)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field label="Display name">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className={inputClasses()}
            />
          </Field>
        </div>

        <Field label={preset.externalIdLabel}>
          <input
            value={externalResourceId}
            onChange={(event) => setExternalResourceId(event.target.value)}
            placeholder={preset.externalIdPlaceholder}
            className={inputClasses()}
          />
        </Field>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-950">{preset.credentialsLabel}</div>

          {preset.requiresCredentialProfile ? (
            <div className="mt-4 space-y-4">
              <Field label="Saved credentials">
                <select
                  value={credentialProfileId}
                  onChange={(event) => setCredentialProfileId(event.target.value)}
                  className={inputClasses()}
                >
                  <option value="">Select credentials</option>
                  {scopedProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.displayName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Base URL">
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder={
                    providerKey === "stratasys" || providerKey === "hp"
                      ? "Required base URL"
                      : "Optional override"
                  }
                  className={inputClasses()}
                />
              </Field>

              {preset.allowLegacyFallback ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Legacy fallback secret name">
                    <input
                      value={vaultSecretName}
                      onChange={(event) => setVaultSecretName(event.target.value)}
                      placeholder="Optional legacy fallback"
                      className={inputClasses()}
                    />
                  </Field>

                  <Field label="Legacy fallback secret ID">
                    <input
                      value={vaultSecretId}
                      onChange={(event) => setVaultSecretId(event.target.value)}
                      placeholder="Optional secret ID"
                      className={inputClasses()}
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <Field label="Base URL">
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="Local agent or API base URL"
                  className={inputClasses()}
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Secret name">
                  <input
                    value={vaultSecretName}
                    onChange={(event) => setVaultSecretName(event.target.value)}
                    placeholder="Optional secret reference"
                    className={inputClasses()}
                  />
                </Field>

                <Field label="Secret ID">
                  <input
                    value={vaultSecretId}
                    onChange={(event) => setVaultSecretId(event.target.value)}
                    placeholder="Optional secret ID"
                    className={inputClasses()}
                  />
                </Field>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={syncEnabled}
                onChange={(event) => setSyncEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Sync enabled
            </label>

            {preset.supportsDiscovery ? (
              <button
                type="button"
                onClick={handleDiscoverMachines}
                disabled={discovering || !credentialProfileId}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {discovering ? "Loading..." : preset.discoveryButtonLabel}
              </button>
            ) : null}
          </div>
        </div>

        <DiscoveryResultsPanel
          discoveredMachines={discoveredMachines}
          selectedDiscoveredIds={selectedDiscoveredIds}
          setSelectedDiscoveredIds={setSelectedDiscoveredIds}
          externalResourceId={externalResourceId}
          setExternalResourceId={setExternalResourceId}
          setDisplayName={setDisplayName}
          setStructuredMetadata={setStructuredMetadata}
          resource={resource}
          providerKey={providerKey}
          preset={preset}
          credentialProfileId={credentialProfileId}
          bulkCreating={bulkCreating}
          handleBulkCreate={handleBulkCreate}
          isDiscoveredSelected={isDiscoveredSelected}
          toggleDiscoveredSelected={toggleDiscoveredSelected}
          creatingFromDiscoveryId={creatingFromDiscoveryId}
          handleCreateFromDiscoveredMachine={handleCreateFromDiscoveredMachine}
        />

        {defaultOrganizationId ? null : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No customer organization context was found for creating new connectors.
          </div>
        )}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {info ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {info}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !resource}
            className="rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a] disabled:opacity-60"
          >
            {saving ? "Saving..." : existingConnection ? "Save connector" : "Create connector"}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !existingConnection}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {testing ? "Testing..." : "Test"}
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !existingConnection}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {syncing ? "Syncing..." : "Sync"}
          </button>

          {existingConnection ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>

        {existingConnection ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">Connection health</div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatProviderLabel(existingConnection.providerKey)} ·{" "}
                  {formatLabel(existingConnection.connectionMode)}
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-medium ${getSyncBadgeClasses(
                  existingConnection.lastSyncStatus,
                )}`}
              >
                {existingConnection.lastSyncStatus || "unknown"}
              </span>
            </div>

            <div className="mt-3 grid gap-1 text-xs text-slate-500">
              <div>Last sync: {formatDateTime(existingConnection.lastSyncAt)}</div>
              <div>External ID: {existingConnection.externalResourceId || "—"}</div>
              <div>Sync enabled: {existingConnection.syncEnabled ? "Yes" : "No"}</div>
            </div>

            {existingConnection.lastError ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {existingConnection.lastError}
              </div>
            ) : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}
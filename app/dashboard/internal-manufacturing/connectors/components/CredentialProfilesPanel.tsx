"use client";

import { useEffect, useState, type FormEvent } from "react";
import type {
  InternalConnectorCredentialProfile,
  InternalConnectorProviderKey,
} from "../types";
import {
  formatDateTime,
  formatLabel,
  formatProviderLabel,
  getProfileBadgeClasses,
  inputClasses,
} from "./connectorUi";
import {
  buildCreateProfileBody,
  buildUpdateProfileBody,
  creatableProviders,
  getDefaultProfileName,
  getProfileDisplaySecondary,
} from "./credentialProfileHelpers";

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

export default function CredentialProfilesPanel({
  organizationId,
  profiles,
  onSaved,
}: {
  organizationId: string | null;
  profiles: InternalConnectorCredentialProfile[];
  onSaved: () => void;
}) {
  const [providerKey, setProviderKey] = useState<InternalConnectorProviderKey>("formlabs");
  const [displayName, setDisplayName] = useState(getDefaultProfileName("formlabs"));
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [tokenExpiresAt, setTokenExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProviderKey, setEditProviderKey] =
    useState<InternalConnectorProviderKey>("formlabs");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editClientSecret, setEditClientSecret] = useState("");
  const [editAccessToken, setEditAccessToken] = useState("");
  const [editRefreshToken, setEditRefreshToken] = useState("");
  const [editTokenExpiresAt, setEditTokenExpiresAt] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showCreate, setShowCreate] = useState(profiles.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(getDefaultProfileName(providerKey));
  }, [providerKey]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!organizationId) {
      setError("No organization was found for this workspace.");
      return;
    }

    setCreating(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch("/api/internal-manufacturing/connector-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildCreateProfileBody({
            organizationId,
            providerKey,
            displayName,
            clientId,
            clientSecret,
            accessToken,
            refreshToken,
            tokenExpiresAt,
          }),
        ),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save credentials.");
      }

      setClientId("");
      setClientSecret("");
      setAccessToken("");
      setRefreshToken("");
      setTokenExpiresAt("");
      setShowCreate(false);
      setInfo(`${formatProviderLabel(providerKey)} credentials saved.`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save credentials.");
    } finally {
      setCreating(false);
    }
  }

  async function handleTest(profileId: string) {
    setTestingId(profileId);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(
        `/api/internal-manufacturing/connector-profiles/${profileId}/test`,
        { method: "POST" },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || payload.message || "Failed to test credentials.");
      }

      setInfo(payload.message || "Credential test completed.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test credentials.");
    } finally {
      setTestingId(null);
    }
  }

  function openEdit(profile: InternalConnectorCredentialProfile) {
    setEditingProfileId(profile.id);
    setEditProviderKey(profile.providerKey);
    setEditDisplayName(profile.displayName);
    setEditClientId("");
    setEditClientSecret("");
    setEditAccessToken("");
    setEditRefreshToken("");
    setEditTokenExpiresAt(profile.tokenExpiresAt ?? "");
    setError(null);
    setInfo(null);
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProfileId) return;

    setUpdating(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(
        `/api/internal-manufacturing/connector-profiles/${editingProfileId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildUpdateProfileBody({
              editProviderKey,
              editDisplayName,
              editClientId,
              editClientSecret,
              editAccessToken,
              editRefreshToken,
              editTokenExpiresAt,
            }),
          ),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update credentials.");
      }

      setInfo("Saved credentials updated.");
      setEditingProfileId(null);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update credentials.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Provider accounts
          </div>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Saved credentials
          </h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Reuse one provider account across many connected machines.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((current) => !current)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          {showCreate ? "Close" : "Add"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {profiles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No provider accounts saved yet.
          </div>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">
                    {profile.displayName}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatProviderLabel(profile.providerKey)} ·{" "}
                    {getProfileDisplaySecondary(profile, formatDateTime, formatLabel)}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {profile.connectionCount} connected machine
                    {profile.connectionCount === 1 ? "" : "s"} · Last tested{" "}
                    {formatDateTime(profile.lastTestedAt)}
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-medium ${getProfileBadgeClasses(
                    profile.lastTestStatus,
                  )}`}
                >
                  {profile.lastTestStatus || "untested"}
                </span>
              </div>

              {profile.lastTestError ? (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {profile.lastTestError}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleTest(profile.id)}
                  disabled={testingId === profile.id}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {testingId === profile.id ? "Testing..." : "Test"}
                </button>

                <button
                  type="button"
                  onClick={() => openEdit(profile)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Replace
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingProfileId ? (
        <form
          onSubmit={handleUpdate}
          className="mt-4 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="text-sm font-semibold text-slate-950">Replace saved credentials</div>

          <Field label="Provider">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              {formatProviderLabel(editProviderKey)}
            </div>
          </Field>

          <Field label="Profile name">
            <input
              value={editDisplayName}
              onChange={(event) => setEditDisplayName(event.target.value)}
              className={inputClasses()}
            />
          </Field>

          {editProviderKey === "ultimaker" ? (
            <>
              <Field label="New access token">
                <input
                  type="password"
                  value={editAccessToken}
                  onChange={(event) => setEditAccessToken(event.target.value)}
                  placeholder="Leave blank to keep current"
                  className={inputClasses()}
                />
              </Field>

              <Field label="New refresh token">
                <input
                  type="password"
                  value={editRefreshToken}
                  onChange={(event) => setEditRefreshToken(event.target.value)}
                  placeholder="Optional"
                  className={inputClasses()}
                />
              </Field>

              <Field label="Token expires at">
                <input
                  type="datetime-local"
                  value={editTokenExpiresAt}
                  onChange={(event) => setEditTokenExpiresAt(event.target.value)}
                  className={inputClasses()}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="New client / access key">
                <input
                  value={editClientId}
                  onChange={(event) => setEditClientId(event.target.value)}
                  placeholder="Leave blank to keep current"
                  className={inputClasses()}
                />
              </Field>

              <Field label="New secret">
                <input
                  type="password"
                  value={editClientSecret}
                  onChange={(event) => setEditClientSecret(event.target.value)}
                  placeholder="Leave blank to keep current"
                  className={inputClasses()}
                />
              </Field>
            </>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={updating}
              className="rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a] disabled:opacity-60"
            >
              {updating ? "Saving..." : "Save changes"}
            </button>

            <button
              type="button"
              onClick={() => setEditingProfileId(null)}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {showCreate ? (
        <form
          onSubmit={handleCreate}
          className="mt-4 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="text-sm font-semibold text-slate-950">Add provider account</div>

          <Field label="Provider">
            <select
              value={providerKey}
              onChange={(event) =>
                setProviderKey(event.target.value as InternalConnectorProviderKey)
              }
              className={inputClasses()}
            >
              {creatableProviders.map((value) => (
                <option key={value} value={value}>
                  {formatProviderLabel(value)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Profile name">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className={inputClasses()}
            />
          </Field>

          {providerKey === "ultimaker" ? (
            <>
              <Field label="Access token">
                <input
                  type="password"
                  value={accessToken}
                  onChange={(event) => setAccessToken(event.target.value)}
                  className={inputClasses()}
                />
              </Field>

              <Field label="Refresh token">
                <input
                  type="password"
                  value={refreshToken}
                  onChange={(event) => setRefreshToken(event.target.value)}
                  placeholder="Optional"
                  className={inputClasses()}
                />
              </Field>

              <Field label="Token expires at">
                <input
                  type="datetime-local"
                  value={tokenExpiresAt}
                  onChange={(event) => setTokenExpiresAt(event.target.value)}
                  className={inputClasses()}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Client / access key">
                <input
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  className={inputClasses()}
                />
              </Field>

              <Field label="Secret">
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(event) => setClientSecret(event.target.value)}
                  className={inputClasses()}
                />
              </Field>
            </>
          )}

          <button
            type="submit"
            disabled={creating}
            className="rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a] disabled:opacity-60"
          >
            {creating ? "Saving..." : `Save ${formatProviderLabel(providerKey)} credentials`}
          </button>
        </form>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {info}
        </div>
      ) : null}
    </div>
  );
}
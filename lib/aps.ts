import "server-only";

const APS_BASE_URL = "https://developer.api.autodesk.com";

type ApsTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

function getEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function requireEnv(name: string) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function isApsStepViewerEnabled() {
  return (
    getEnv("APS_STEP_VIEWER_ENABLED").toLowerCase() === "true" &&
    Boolean(getEnv("APS_CLIENT_ID")) &&
    Boolean(getEnv("APS_CLIENT_SECRET")) &&
    Boolean(getEnv("APS_BUCKET_KEY"))
  );
}

export function assertApsStepViewerEnabled() {
  if (!isApsStepViewerEnabled()) {
    throw new Error("APS STEP viewer is disabled.");
  }
}

function getBucketKey() {
  return requireEnv("APS_BUCKET_KEY").toLowerCase();
}

function getRegion() {
  return (getEnv("APS_REGION") || "EMEA").toUpperCase();
}

export function toApsUrn(objectId: string) {
  return Buffer.from(objectId).toString("base64").replace(/=/g, "");
}

export async function getApsAccessToken(scopes: string[]) {
  assertApsStepViewerEnabled();

  const clientId = requireEnv("APS_CLIENT_ID");
  const clientSecret = requireEnv("APS_CLIENT_SECRET");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: scopes.join(" "),
  });

  const response = await fetch(`${APS_BASE_URL}/authentication/v2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`APS token request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as ApsTokenResponse;
}

export async function ensureApsBucket() {
  const bucketKey = getBucketKey();
  const region = getRegion();

  const token = await getApsAccessToken([
    "bucket:create",
    "bucket:read",
    "data:write",
    "data:read",
  ]);

  const response = await fetch(`${APS_BASE_URL}/oss/v2/buckets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketKey,
      policyKey: "transient",
      region,
    }),
    cache: "no-store",
  });

  if (response.ok || response.status === 409) {
    return;
  }

  const text = await response.text();
  throw new Error(`APS bucket creation failed: ${response.status} ${text}`);
}

export async function uploadObjectToAps(params: {
  objectKey: string;
  fileBuffer: ArrayBuffer;
  contentType?: string;
}) {
  await ensureApsBucket();

  const bucketKey = getBucketKey();
  const token = await getApsAccessToken([
    "bucket:create",
    "bucket:read",
    "data:write",
    "data:read",
  ]);

  const encodedObjectKey = encodeURIComponent(params.objectKey);

  const signedResponse = await fetch(
    `${APS_BASE_URL}/oss/v2/buckets/${bucketKey}/objects/${encodedObjectKey}/signeds3upload`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
      cache: "no-store",
    },
  );

  if (!signedResponse.ok) {
    const text = await signedResponse.text();
    throw new Error(
      `APS signed upload request failed: ${signedResponse.status} ${text}`,
    );
  }

  const signedPayload = (await signedResponse.json()) as {
    urls?: string[];
    uploadKey?: string;
  };

  const uploadUrl = signedPayload.urls?.[0];
  const uploadKey = signedPayload.uploadKey;

  if (!uploadUrl || !uploadKey) {
    throw new Error("APS signed upload did not return upload URL.");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": params.contentType || "application/octet-stream",
    },
    body: params.fileBuffer,
    cache: "no-store",
  });

  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    throw new Error(`APS file upload failed: ${uploadResponse.status} ${text}`);
  }

  const completeResponse = await fetch(
    `${APS_BASE_URL}/oss/v2/buckets/${bucketKey}/objects/${encodedObjectKey}/signeds3upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uploadKey }),
      cache: "no-store",
    },
  );

  if (!completeResponse.ok) {
    const text = await completeResponse.text();
    throw new Error(
      `APS upload completion failed: ${completeResponse.status} ${text}`,
    );
  }

  return (await completeResponse.json()) as {
    bucketKey: string;
    objectId: string;
    objectKey: string;
  };
}

export async function startApsTranslation(urn: string) {
  const token = await getApsAccessToken([
    "data:read",
    "data:write",
    "bucket:read",
  ]);

  const response = await fetch(
    `${APS_BASE_URL}/modelderivative/v2/designdata/job`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          urn,
        },
        output: {
          formats: [
            {
              type: "svf2",
              views: ["2d", "3d"],
            },
          ],
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`APS translation failed: ${response.status} ${text}`);
  }

  return await response.json();
}

export async function getApsManifest(urn: string) {
  const token = await getApsAccessToken(["data:read", "bucket:read"]);

  const response = await fetch(
    `${APS_BASE_URL}/modelderivative/v2/designdata/${encodeURIComponent(
      urn,
    )}/manifest`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`APS manifest fetch failed: ${response.status} ${text}`);
  }

  return await response.json();
}

export async function getApsViewerToken() {
  return getApsAccessToken(["viewables:read"]);
}
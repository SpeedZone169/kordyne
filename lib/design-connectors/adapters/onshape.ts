import { MockDesignConnectorAdapter } from "./mock";

const ONSHAPE_BASE_URL = "https://cad.onshape.com";

function onshapeWorkspaceUrl(documentId: string, workspaceId: string, elementId: string) {
  return `${ONSHAPE_BASE_URL}/documents/${documentId}/w/${workspaceId}/e/${elementId}`;
}

export const onshapeDesignConnectorAdapter = new MockDesignConnectorAdapter({
  providerKey: "onshape",
  providerLabel: "Onshape",
  supportedAuthModes: ["oauth_authorization_code", "api_token"],
  scopes: [
    {
      id: "onshape-workspace-main",
      label: "Onshape Demo Workspace",
      scope_type: "workspace",
      metadata: {
        adapter_mode: "mock",
        region: "global",
      },
    },
    {
      id: "onshape-doc-bracket",
      label: "Bracket Assembly Document",
      scope_type: "document",
      metadata: {
        adapter_mode: "mock",
        workspace_id: "onshape-workspace-main",
      },
    },
  ],
  items: [
    {
      id: "onshape-element-bracket-ps",
      name: "Bracket Demo Part Studio",
      item_type: "part_studio",
      version_id: "onshape-version-bracket-v3",
      revision_id: "C",
      workspace_id: "onshape-workspace-main",
      document_id: "onshape-doc-bracket",
      external_url: onshapeWorkspaceUrl(
        "onshape-doc-bracket",
        "onshape-workspace-main",
        "onshape-element-bracket-ps",
      ),
      metadata: {
        adapter_mode: "mock",
        element_id: "onshape-element-bracket-ps",
        element_type: "partstudio",
        part_number: "KD-ON-1001",
        description: "Mock Onshape bracket part studio for connector validation.",
        units: "millimeter",
        material: "Aluminum 6061",
      },
    },
    {
      id: "onshape-element-bracket-asm",
      name: "Bracket Clamp Assembly",
      item_type: "assembly",
      version_id: "onshape-version-bracket-v3",
      revision_id: "C",
      workspace_id: "onshape-workspace-main",
      document_id: "onshape-doc-bracket",
      external_url: onshapeWorkspaceUrl(
        "onshape-doc-bracket",
        "onshape-workspace-main",
        "onshape-element-bracket-asm",
      ),
      metadata: {
        adapter_mode: "mock",
        element_id: "onshape-element-bracket-asm",
        element_type: "assembly",
        part_number: "KD-ON-ASM-1001",
        description: "Mock Onshape assembly used to exercise item sync.",
        units: "millimeter",
        material: "Mixed",
      },
    },
  ],
  versions: [
    {
      id: "onshape-version-bracket-v1",
      label: "V1",
      revision: "A",
      created_at: "2026-05-01T09:00:00.000Z",
      metadata: {
        document_id: "onshape-doc-bracket",
        item_id: "onshape-element-bracket-ps",
      },
    },
    {
      id: "onshape-version-bracket-v2",
      label: "V2",
      revision: "B",
      created_at: "2026-05-08T09:00:00.000Z",
      metadata: {
        document_id: "onshape-doc-bracket",
        item_id: "onshape-element-bracket-ps",
      },
    },
    {
      id: "onshape-version-bracket-v3",
      label: "V3",
      revision: "C",
      created_at: "2026-05-15T09:00:00.000Z",
      metadata: {
        document_id: "onshape-doc-bracket",
        item_id: "onshape-element-bracket-ps",
      },
    },
  ],
});

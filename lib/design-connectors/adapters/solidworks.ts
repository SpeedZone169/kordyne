import { MockDesignConnectorAdapter } from "./mock";

export const solidWorksDesignConnectorAdapter = new MockDesignConnectorAdapter({
  providerKey: "solidworks",
  providerLabel: "SolidWorks",
  supportedAuthModes: ["oauth_authorization_code", "api_token"],
  scopes: [
    {
      id: "solidworks-project-demo",
      label: "SolidWorks Demo Project",
      scope_type: "project",
      metadata: {
        adapter_mode: "mock",
        folder_id: "solidworks-folder-demo",
      },
    },
  ],
  items: [
    {
      id: "solidworks-part-fixture",
      name: "Fixture Plate.SLDPRT",
      item_type: "part",
      version_id: "solidworks-version-fixture-b",
      revision_id: "B",
      project_id: "solidworks-project-demo",
      document_id: "solidworks-doc-fixture",
      external_url: "kordyne://cad/open?provider=solidworks&id=solidworks-part-fixture",
      metadata: {
        adapter_mode: "mock",
        folder_id: "solidworks-folder-demo",
        part_number: "KD-SW-2001",
        description: "Mock SolidWorks part used to validate desktop helper handoff.",
        units: "millimeter",
        material: "Tool steel",
      },
    },
    {
      id: "solidworks-asm-fixture",
      name: "Fixture Assembly.SLDASM",
      item_type: "assembly",
      version_id: "solidworks-version-fixture-b",
      revision_id: "B",
      project_id: "solidworks-project-demo",
      document_id: "solidworks-doc-fixture-asm",
      external_url: "kordyne://cad/open?provider=solidworks&id=solidworks-asm-fixture",
      metadata: {
        adapter_mode: "mock",
        folder_id: "solidworks-folder-demo",
        part_number: "KD-SW-ASM-2001",
        description: "Mock SolidWorks assembly for connector sync testing.",
        units: "millimeter",
        material: "Mixed",
      },
    },
  ],
  versions: [
    {
      id: "solidworks-version-fixture-a",
      label: "Rev A",
      revision: "A",
      created_at: "2026-05-03T10:00:00.000Z",
      metadata: {
        document_id: "solidworks-doc-fixture",
        item_id: "solidworks-part-fixture",
      },
    },
    {
      id: "solidworks-version-fixture-b",
      label: "Rev B",
      revision: "B",
      created_at: "2026-05-12T10:00:00.000Z",
      metadata: {
        document_id: "solidworks-doc-fixture",
        item_id: "solidworks-part-fixture",
      },
    },
  ],
});

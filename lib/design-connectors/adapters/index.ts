import type { DesignConnectorProvider } from "../types";
import {
  type DesignConnectorAdapter,
  UnsupportedDesignConnectorAdapter,
} from "./base";
import { fusionDesignConnectorAdapter } from "./fusion";
import { onshapeDesignConnectorAdapter } from "./onshape";
import { solidWorksDesignConnectorAdapter } from "./solidworks";

const adapters: Partial<Record<DesignConnectorProvider, DesignConnectorAdapter>> =
  {
    fusion: fusionDesignConnectorAdapter,
    onshape: onshapeDesignConnectorAdapter,
    solidworks: solidWorksDesignConnectorAdapter,
  };

export function getDesignConnectorAdapter(
  providerKey: string,
): DesignConnectorAdapter {
  const adapter = adapters[providerKey as DesignConnectorProvider];

  if (adapter) {
    return adapter;
  }

  return new UnsupportedDesignConnectorAdapter(providerKey);
}

export function hasDesignConnectorAdapter(
  providerKey: string,
): providerKey is DesignConnectorProvider {
  return providerKey in adapters;
}

export { fusionDesignConnectorAdapter };
export { onshapeDesignConnectorAdapter };
export { solidWorksDesignConnectorAdapter };
export type { DesignConnectorAdapter };

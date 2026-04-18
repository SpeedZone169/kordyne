import type { DesignConnectorProvider } from "../types";
import {
  type DesignConnectorAdapter,
  UnsupportedDesignConnectorAdapter,
} from "./base";
import { fusionDesignConnectorAdapter } from "./fusion";

const adapters: Partial<Record<DesignConnectorProvider, DesignConnectorAdapter>> =
  {
    fusion: fusionDesignConnectorAdapter,
  };

export function getDesignConnectorAdapter(
  providerKey: string,
): DesignConnectorAdapter {
  if (providerKey === "fusion") {
    return fusionDesignConnectorAdapter;
  }

  return new UnsupportedDesignConnectorAdapter(providerKey);
}

export function hasDesignConnectorAdapter(
  providerKey: string,
): providerKey is DesignConnectorProvider {
  return providerKey in adapters;
}

export { fusionDesignConnectorAdapter };
export type { DesignConnectorAdapter };
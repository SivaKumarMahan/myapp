import { SUBSCRIPTION_ID, type SeedResource } from '../../../lib/tflab/engine'

/** Shared building blocks for the scenarios. */

export const SUB = SUBSCRIPTION_ID

export const rgId = (name: string) => `/subscriptions/${SUB}/resourceGroups/${name}`

export const storageId = (rg: string, name: string) =>
  `${rgId(rg)}/providers/Microsoft.Storage/storageAccounts/${name}`

/** providers.tf: version pins, the azurerm backend, and the provider block. */
export const providersTf = (stateKey: string) => `terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstatecontoso01"
    container_name       = "tfstate"
    key                  = "${stateKey}"
  }
}

# azurerm v4 needs a subscription ID: the pipeline sets ARM_SUBSCRIPTION_ID.
provider "azurerm" {
  features {}
}
`

/** The state backend itself lives in Azure too (not managed by this config). */
export const backendResources = (): SeedResource[] => [
  {
    key: 'tfstate-rg',
    type: 'azurerm_resource_group',
    attrs: { name: 'rg-tfstate', location: 'westeurope', tags: { purpose: 'terraform-state' } },
    createdAt: '2024-01-08T09:12:44Z',
    createdBy: 'platform-bootstrap',
  },
  {
    key: 'tfstate-sa',
    type: 'azurerm_storage_account',
    attrs: {
      name: 'sttfstatecontoso01',
      resource_group_name: 'rg-tfstate',
      location: 'westeurope',
      account_tier: 'Standard',
      account_replication_type: 'GRS',
      allow_nested_items_to_be_public: false,
      tags: { purpose: 'terraform-state' },
    },
    createdAt: '2024-01-08T09:13:20Z',
    createdBy: 'platform-bootstrap',
  },
]

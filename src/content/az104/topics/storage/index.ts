import type { Topic } from '../../../types'
import { az1StorageAccounts } from './storage-accounts'
import { az1StorageSecurity } from './storage-security'
import { az1BlobStorage } from './blob-storage'
import { az1AzureFiles } from './azure-files'

/** Lessons in this domain, in teaching order. */
export const az104StorageTopics: Topic[] = [
  az1StorageAccounts,
  az1StorageSecurity,
  az1BlobStorage,
  az1AzureFiles,
]

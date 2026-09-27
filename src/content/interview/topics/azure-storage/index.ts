import type { InterviewTopic } from '../../../types'
import { azureStorageAccountQuestions } from './accounts'
import { azureStorageDatabaseQuestions } from './databases'
import { azureStorageOperationsQuestions } from './operations'

export const azureStorageTopic: InterviewTopic = {
  id: 'azure-storage',
  title: 'Azure storage & databases',
  shortTitle: 'Storage',
  icon: '🗄️',
  order: 5,
  oneLiner:
    'Redundancy as failure domains, tiers and lifecycle, identity-first access, Azure SQL and Cosmos DB design, and the throttling and failover incidents that test it all.',
  headlines: [
    'LRS survives a rack, ZRS a zone, GRS/GZRS a region. **RA-** adds a readable secondary without failing over.',
    'Geo-replication is asynchronous: **Last Sync Time** is your data loss in an unplanned failover, and the account is LRS afterwards.',
    'Archive is **offline**. Cool, Cold and Archive have minimum retention periods and early-deletion charges.',
    'Prefer managed identity + **Storage Blob Data** roles; a user delegation SAS is signed via Entra; account keys grant everything.',
    'A resource lock protects the account, not the blobs. Locked immutability and vaulted backup protect the data.',
    'Azure SQL failover groups give a **listener** endpoint, so the connection string survives failover.',
    'In Cosmos DB the **partition key** is immutable and decides both cost and throttling; RU/s is split across physical partitions.',
    'Storage throttles with 503 ServerBusy; Cosmos DB, Key Vault and ARM throttle with 429 and a retry-after hint.',
  ],
  questions: [
    ...azureStorageAccountQuestions,
    ...azureStorageDatabaseQuestions,
    ...azureStorageOperationsQuestions,
  ],
}

import type { Topic } from '../../../types'
import { azureMonitor } from './azure-monitor'
import { networkWatcher } from './network-watcher'
import { backupRecovery } from './backup-recovery'

/** Lessons in this domain, in teaching order. */
export const az104MonitorTopics: Topic[] = [azureMonitor, networkWatcher, backupRecovery]

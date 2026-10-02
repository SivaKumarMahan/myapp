/**
 * The KQL simulator's tables, modelled on Log Analytics and Application
 * Insights. Column names and meanings follow the real tables; only a useful
 * subset of columns is included.
 */

export type KqlType = 'datetime' | 'string' | 'int' | 'real' | 'bool'

export interface KqlTable {
  name: string
  description: string
  columns: { name: string; type: KqlType }[]
}

/**
 * The simulator's clock. Every row is generated in the 24 hours before this
 * moment, and `now()` / `ago()` are measured from it - so `ago(1h)` always
 * finds data, and every challenge has the same answer every time.
 */
export const KQL_NOW = '2025-10-01 12:00:00'

const col = (name: string, type: KqlType) => ({ name, type })

export const kqlTables: KqlTable[] = [
  {
    name: 'Heartbeat',
    description: 'One row every 5 minutes from each VM agent, for the last 6 hours',
    columns: [
      col('TimeGenerated', 'datetime'),
      col('Computer', 'string'),
      col('OSType', 'string'),
      col('ResourceGroup', 'string'),
      col('Category', 'string'),
      col('ComputerIP', 'string'),
    ],
  },
  {
    name: 'Perf',
    description: 'CPU, memory and disk counters every 15 minutes for the last 6 hours',
    columns: [
      col('TimeGenerated', 'datetime'),
      col('Computer', 'string'),
      col('ObjectName', 'string'),
      col('CounterName', 'string'),
      col('InstanceName', 'string'),
      col('CounterValue', 'real'),
    ],
  },
  {
    name: 'requests',
    description: 'Application Insights requests to the shop web app and API (24 hours)',
    columns: [
      col('timestamp', 'datetime'),
      col('name', 'string'),
      col('url', 'string'),
      col('resultCode', 'string'),
      col('success', 'bool'),
      col('duration', 'real'),
      col('operation_Id', 'string'),
      col('cloud_RoleName', 'string'),
      col('client_City', 'string'),
    ],
  },
  {
    name: 'exceptions',
    description: 'Application Insights exceptions, linked to requests by operation_Id',
    columns: [
      col('timestamp', 'datetime'),
      col('type', 'string'),
      col('outerMessage', 'string'),
      col('operation_Id', 'string'),
      col('cloud_RoleName', 'string'),
      col('severityLevel', 'int'),
    ],
  },
  {
    name: 'SigninLogs',
    description: 'Microsoft Entra ID sign-ins. ResultType "0" is success',
    columns: [
      col('TimeGenerated', 'datetime'),
      col('UserPrincipalName', 'string'),
      col('AppDisplayName', 'string'),
      col('IPAddress', 'string'),
      col('Location', 'string'),
      col('ResultType', 'string'),
      col('ResultDescription', 'string'),
      col('ConditionalAccessStatus', 'string'),
    ],
  },
  {
    name: 'AzureActivity',
    description: 'Control-plane operations on Azure resources (the activity log)',
    columns: [
      col('TimeGenerated', 'datetime'),
      col('OperationNameValue', 'string'),
      col('ActivityStatusValue', 'string'),
      col('Caller', 'string'),
      col('ResourceGroup', 'string'),
      col('ResourceProviderValue', 'string'),
      col('_ResourceId', 'string'),
      col('CategoryValue', 'string'),
    ],
  },
]

export const kqlTableByName = new Map(kqlTables.map((table) => [table.name.toLowerCase(), table]))

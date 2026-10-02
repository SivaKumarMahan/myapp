import hr from './datasets/hr.sql?raw'
import shop from './datasets/shop.sql?raw'
import logs from './datasets/logs.sql?raw'

/** The SQL playground's sample data, as plain `.sql` files. */
export interface SqlDataset {
  id: string
  title: string
  description: string
  sql: string
}

export const sqlDatasets: SqlDataset[] = [
  {
    id: 'hr',
    title: 'HR',
    description: 'departments and employees, with a manager hierarchy',
    sql: hr,
  },
  {
    id: 'shop',
    title: 'Shop',
    description: 'customers, products, orders and order_items',
    sql: shop,
  },
  {
    id: 'logs',
    title: 'Web logs',
    description: 'web_logs: 400 HTTP requests over three days',
    sql: logs,
  },
]

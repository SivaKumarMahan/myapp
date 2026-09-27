import type { InterviewQuestion } from '../../../types'

/** SimCorp round: SQL basics, PostgreSQL and AKS-to-PostgreSQL troubleshooting. */
export const roundsSimcorpDatabaseQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rsim-10',
    level: 'basic',
    kind: 'open',
    prompt: 'Basic SQL queries: how do you select, filter and sort records?',
    probing: 'Comfort writing SELECT with WHERE, AND/OR, ORDER BY and DISTINCT from memory.',
    answer: [
      'For a DevOps interview, these are the basic SQL queries you should be comfortable with.',
      'The queries: select all records, select specific columns, filter with a WHERE condition, combine conditions with AND / OR, sort with ORDER BY (DESC for highest first, ASC for lowest first), and list unique values with DISTINCT.',
    ],
    code: [
      {
        title: 'Select all records',
        language: 'text',
        code: `SELECT * FROM employees;`,
      },
      {
        title: 'Select specific columns',
        language: 'text',
        code: `SELECT name, salary
FROM employees;`,
      },
      {
        title: 'WHERE condition',
        language: 'text',
        code: `SELECT *
FROM employees
WHERE department = 'IT';`,
      },
      {
        title: 'AND / OR',
        language: 'text',
        code: `SELECT *
FROM employees
WHERE department = 'IT'
AND salary > 50000;`,
      },
      {
        title: 'AND / OR',
        language: 'text',
        code: `SELECT *
FROM employees
WHERE department = 'IT'
OR department = 'HR';`,
      },
      {
        title: 'ORDER BY — Highest salary first',
        language: 'text',
        code: `SELECT *
FROM employees
ORDER BY salary DESC;`,
      },
      {
        title: 'ORDER BY — Lowest salary first',
        language: 'text',
        code: `SELECT *
FROM employees
ORDER BY salary ASC;`,
      },
      {
        title: 'DISTINCT',
        language: 'text',
        code: `SELECT DISTINCT department
FROM employees;`,
      },
    ],
    tags: ['sql', 'database'],
  },
  {
    id: 'itv-rsim-11',
    level: 'basic',
    kind: 'open',
    prompt:
      'Basic SQL queries: how do you count, group and match records (COUNT, GROUP BY, HAVING, LIKE, BETWEEN, IN, NULL)?',
    probing:
      'Aggregates with GROUP BY and HAVING, and the common filter operators including IS NULL.',
    answer: [
      'These cover counting, grouping and matching records in the `employees` table.',
      "- **COUNT**: count all employees, or only the employees in IT\n- **GROUP BY**: count employees by department\n- **HAVING**: departments with more than 5 employees (`HAVING COUNT(*) > 5`)\n- **LIKE**: names starting with A (`'A%'`) or containing k (`'%k%'`)\n- **BETWEEN**: salaries between 50000 and 100000\n- **IN**: departments in IT, HR and Finance\n- **NULL**: employees without a manager (`IS NULL`) or with one (`IS NOT NULL`)",
    ],
    code: [
      {
        title: 'COUNT',
        language: 'text',
        code: `SELECT COUNT(*)
FROM employees;`,
      },
      {
        title: 'Count employees in IT',
        language: 'text',
        code: `SELECT COUNT(*)
FROM employees
WHERE department = 'IT';`,
      },
      {
        title: 'Count employees by department',
        language: 'text',
        code: `SELECT department, COUNT(*)
FROM employees
GROUP BY department;`,
      },
      {
        title: 'Departments with more than 5 employees',
        language: 'text',
        code: `SELECT department, COUNT(*)
FROM employees
GROUP BY department
HAVING COUNT(*) > 5;`,
      },
      {
        title: 'LIKE — Names starting with A',
        language: 'text',
        code: `SELECT *
FROM employees
WHERE name LIKE 'A%';`,
      },
      {
        title: 'LIKE — Names containing k',
        language: 'text',
        code: `SELECT *
FROM employees
WHERE name LIKE '%k%';`,
      },
      {
        title: 'BETWEEN',
        language: 'text',
        code: `SELECT *
FROM employees
WHERE salary BETWEEN 50000 AND 100000;`,
      },
      {
        title: 'IN list',
        language: 'text',
        code: `SELECT *
FROM employees
WHERE department IN ('IT', 'HR', 'Finance');`,
      },
      {
        title: 'NULL',
        language: 'text',
        code: `SELECT *
FROM employees
WHERE manager_id IS NULL;`,
      },
      {
        title: 'Not null',
        language: 'text',
        code: `SELECT *
FROM employees
WHERE manager_id IS NOT NULL;`,
      },
    ],
    tags: ['sql', 'database'],
  },
  {
    id: 'itv-rsim-12',
    level: 'basic',
    kind: 'open',
    prompt: 'Basic SQL queries: how do you insert, update and delete rows safely?',
    probing: 'INSERT, UPDATE and DELETE syntax, and the habit of always using WHERE.',
    answer: [
      '**15. UPDATE:** Always use `WHERE` with `UPDATE` unless you intentionally want to update every row.',
      '**16. DELETE:** Again, without `WHERE`, you can delete every row.',
    ],
    code: [
      {
        title: 'INSERT',
        language: 'text',
        code: `INSERT INTO employees
(name, department, salary)
VALUES
('Siva', 'IT', 80000);`,
      },
      {
        title: 'UPDATE',
        language: 'text',
        code: `UPDATE employees
SET salary = 90000
WHERE name = 'Siva';`,
      },
      {
        title: 'DELETE',
        language: 'text',
        code: `DELETE FROM employees
WHERE name = 'Siva';`,
      },
    ],
    tags: ['sql', 'database'],
  },
  {
    id: 'itv-rsim-13',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Basic SQL queries: joins, aggregate functions and the second-highest salary.',
    probing:
      'INNER versus LEFT JOIN, aggregate functions, and the classic subquery for the second-highest value.',
    answer: [
      'Suppose an `employees` table (id, name, department_id) and a `departments` table (id, department_name). The INNER JOIN query links them on `e.department_id = d.id`.',
      "**LEFT JOIN:** Returns all employees, even if they don't have a matching department.",
      'For the second-highest salary, a common interview question, take the `MAX(salary)` of the rows whose salary is below the overall `MAX(salary)` (a subquery).',
    ],
    code: [
      {
        title: 'INNER JOIN — Suppose',
        language: 'text',
        code: `employees
---------
id
name
department_id

departments
-----------
id
department_name`,
      },
      {
        title: 'INNER JOIN — Query',
        language: 'text',
        code: `SELECT e.name, d.department_name
FROM employees e
INNER JOIN departments d
ON e.department_id = d.id;`,
      },
      {
        title: 'LEFT JOIN',
        language: 'text',
        code: `SELECT e.name, d.department_name
FROM employees e
LEFT JOIN departments d
ON e.department_id = d.id;`,
      },
      {
        title: 'MAX / MIN / AVG / SUM',
        language: 'text',
        code: `SELECT MAX(salary) FROM employees;
SELECT MIN(salary) FROM employees;
SELECT AVG(salary) FROM employees;
SELECT SUM(salary) FROM employees;`,
      },
      {
        title: 'Second highest salary — A common interview question',
        language: 'text',
        code: `SELECT MAX(salary)
FROM employees
WHERE salary < (
    SELECT MAX(salary)
    FROM employees
);`,
      },
    ],
    tags: ['sql', 'joins', 'database'],
  },
  {
    id: 'itv-rsim-14',
    level: 'basic',
    kind: 'open',
    prompt:
      'Which SQL practice topics should you be ready to write or explain in a DevOps interview?',
    probing: 'Breadth of everyday SQL knowledge beyond simple SELECTs.',
    answer: [
      'For a DevOps interview, these are the basic SQL areas you should be comfortable with beyond the simple queries.',
      '**Practice topics:** Be ready to write queries or explain:',
      '- Find duplicate records\n- Find second/third highest salary\n- Count records by department\n- Find employees without a manager\n- Find employees whose salary is greater than the average\n- INNER JOIN vs LEFT JOIN\n- DELETE vs TRUNCATE vs DROP\n- Primary key vs foreign key\n- Indexes\n- WHERE vs HAVING\n- UNION vs UNION ALL\n- Basic SELECT, INSERT, UPDATE, DELETE',
    ],
    tags: ['sql', 'revision'],
  },
  {
    id: 'itv-rsim-15',
    level: 'basic',
    kind: 'open',
    prompt:
      'What are the PostgreSQL basics a DevOps engineer should know (architecture, terms, default port)?',
    probing:
      'The database / schema / table hierarchy, key terms, port 5432 and the AKS-to-Azure-PostgreSQL path.',
    answer: [
      "For a DevOps interview, you don't need to go deep into PostgreSQL internals unless the role specifically asks for DBA skills. Focus on **architecture, connectivity, backup/restore, HA, monitoring, and troubleshooting**.",
      '**PostgreSQL basics**',
      'PostgreSQL is an **open-source relational database management system**. It uses SQL and is commonly used as the backend database for web applications, APIs, and microservices. Important terms',
      '- **Database**: A logical container for tables, views, functions, etc.\n- **Schema**: A namespace inside a database used to organize objects\n- **Table**: Stores structured data in rows and columns\n- **Primary Key**: Uniquely identifies a row\n- **Foreign Key**: Creates a relationship between tables',
      '**Default PostgreSQL port**',
      'PostgreSQL normally listens on **5432**.',
    ],
    code: [
      {
        title: 'PostgreSQL basics — Typical architecture',
        language: 'text',
        code: `Application / Microservice
          |
          | TCP 5432
          ↓
   PostgreSQL Server
          |
    ┌─────┴─────┐
    ↓           ↓
 Database     Database
    |
  Schema
    |
  Tables
    |
   Rows`,
      },
      {
        title: 'Important terms',
        language: 'text',
        code: `PostgreSQL
   └── Database
        └── Schema
             └── Tables`,
      },
      {
        title: 'Default PostgreSQL port',
        language: 'text',
        code: `Application → PostgreSQL:5432`,
      },
      {
        title: 'Default PostgreSQL port — In Azure, you might have',
        language: 'text',
        code: `AKS Pod
   ↓
Private DNS
   ↓
Azure Database for PostgreSQL
   ↓
Port 5432`,
      },
    ],
    tags: ['postgresql', 'database'],
  },
  {
    id: 'itv-rsim-16',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the basic PostgreSQL commands and SQL you use?',
    probing: 'Connecting with psql, the common meta-commands, and basic DDL and DML.',
    answer: [
      '**Basic PostgreSQL commands**',
      '`psql` meta-commands:',
      '- **`\\l`**: List databases\n- **`\\c myapp`**: Connect to a database\n- **`\\dt`**: List tables\n- **`\\d employees`**: Describe a table\n- **`\\dn`**: List schemas\n- **`\\q`**: Exit',
    ],
    code: [
      {
        title: 'Basic PostgreSQL commands — Connect to PostgreSQL',
        language: 'bash',
        code: `psql -h <hostname> -U <username> -d <database>

# Example
psql -h postgres.example.com -U appuser -d myapp`,
      },
      {
        title: 'Basic SQL — Create table',
        language: 'text',
        code: `CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    department VARCHAR(50),
    salary NUMERIC(10,2)
);`,
      },
      {
        title: 'Basic SQL — Insert',
        language: 'text',
        code: `INSERT INTO employees
(name, department, salary)
VALUES
('Siva', 'IT', 80000);`,
      },
      {
        title: 'Basic SQL — Select',
        language: 'text',
        code: `SELECT * FROM employees;`,
      },
      {
        title: 'Basic SQL — Update',
        language: 'text',
        code: `UPDATE employees
SET salary = 90000
WHERE id = 1;`,
      },
      {
        title: 'Basic SQL — Delete',
        language: 'text',
        code: `DELETE FROM employees
WHERE id = 1;`,
      },
    ],
    tags: ['postgresql', 'psql', 'sql'],
  },
  {
    id: 'itv-rsim-17',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you back up, restore and make PostgreSQL highly available?',
    probing:
      'pg_dump and pg_restore in plain and custom formats, primary/standby replication, and what Azure Database for PostgreSQL manages for you.',
    answer: [
      '**Backup and restore**',
      'This is important for a DevOps interview.',
      '**High availability**',
      'PostgreSQL can be configured with a **primary and standby/replica** architecture.',
      'If the primary fails, a standby can be promoted depending on the HA setup.',
      'For **Azure Database for PostgreSQL**, Azure provides managed capabilities for backups, high availability, and other operational features depending on the service/tier.',
    ],
    code: [
      {
        title: 'Plain SQL backup with pg_dump',
        language: 'bash',
        code: `pg_dump -h <host> -U <user> -d <database> > backup.sql`,
      },
      {
        title: 'Backup and restore — Restore',
        language: 'bash',
        code: `psql -h <host> -U <user> -d <database> < backup.sql`,
      },
      {
        title: 'Backup and restore — Custom-format backup',
        language: 'bash',
        code: `pg_dump -Fc -h <host> -U <user> -d <database> -f backup.dump`,
      },
      {
        title: 'Backup and restore — Restore',
        language: 'bash',
        code: `pg_restore -h <host> -U <user> -d <database> backup.dump`,
      },
      {
        title: 'High availability',
        language: 'text',
        code: `              Application
                   |
                   ↓
             Primary DB
                   |
             Replication
                   ↓
             Standby DB`,
      },
    ],
    tags: ['postgresql', 'backup', 'high availability'],
  },
  {
    id: 'itv-rsim-18',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'An application that uses PostgreSQL is returning 502 / 504 errors. How do you troubleshoot it?',
    probing:
      'An ordered check from pods and logs through DNS and port reachability to database connectivity and the Azure network path.',
    answer: [
      '**Troubleshooting (502 / 504 from an app that uses PostgreSQL)**',
      'Troubleshoot in this order:',
      '**1.** Check application pods:',
      '**2.** Check application logs:',
      '**3.** Test DNS from the pod:',
      '**4.** Test port connectivity:',
      '**5.** Check PostgreSQL connectivity:',
      '**6.** Check Azure networking:',
      'A DNS problem, firewall restriction, NSG rule, private endpoint issue, or incorrect credentials can prevent connectivity.',
    ],
    followUps: [
      'How do you tell a DNS problem from a firewall problem?',
      'What would "too many connections" in the logs point you to?',
    ],
    code: [
      {
        title: 'Troubleshooting — Check application pods',
        language: 'bash',
        code: `kubectl get pods -n <namespace>`,
      },
      {
        title: 'Troubleshooting — Check application logs',
        language: 'bash',
        code: `kubectl logs <pod-name> -n <namespace>`,
      },
      {
        title: 'Troubleshooting — Look for',
        language: 'text',
        code: `connection refused
connection timeout
authentication failed
too many connections
connection pool exhausted`,
      },
      {
        title: 'Troubleshooting — Test DNS from the pod',
        language: 'bash',
        code: `kubectl exec -it <pod-name> -n <namespace> -- nslookup <postgres-host>`,
      },
      {
        title: 'Troubleshooting — Test port connectivity',
        language: 'bash',
        code: `kubectl exec -it <pod-name> -n <namespace> -- nc -zv <postgres-host> 5432`,
      },
      {
        title: 'Check PostgreSQL connectivity',
        language: 'bash',
        code: `psql -h <postgres-host> -U <username> -d <database>`,
      },
      {
        title: 'Troubleshooting — Check Azure networking',
        language: 'text',
        code: `AKS subnet
   ↓
NSG / Firewall
   ↓
Private Endpoint
   ↓
Private DNS
   ↓
PostgreSQL`,
      },
    ],
    tags: ['postgresql', 'troubleshooting', 'aks'],
  },
  {
    id: 'itv-rsim-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is a connection pool, and what goes wrong with it in production?',
    probing:
      'Why apps pool connections, the settings to check, and the classic mistake of multiplying a large pool across many pods.',
    answer: [
      "**Connection pool:** Applications usually don't create a brand-new database connection for every request. They use a **connection pool**.",
      'If the pool is exhausted, the application may show errors such as:',
      'You should check (Connection pool):',
      '- Maximum pool size\n- Connection timeout\n- Idle connections\n- PostgreSQL `max_connections`\n- Application replica count',
      '**Common production problem:** setting the pool too high on every pod.',
      '`20 pods × 50 DB connections = potentially 1000 connections`, while PostgreSQL may only allow a much smaller number.',
    ],
    code: [
      {
        title: 'Connection pool',
        language: 'text',
        code: `100 application requests
        ↓
   Connection Pool
        ↓
   10 DB connections
        ↓
   PostgreSQL`,
      },
      {
        title: 'Connection pool',
        language: 'text',
        code: `Connection pool exhausted
Timeout waiting for connection`,
      },
    ],
    tags: ['postgresql', 'connection pool'],
  },
  {
    id: 'itv-rsim-20',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Which PostgreSQL monitoring queries and indexing practices should you know?',
    probing:
      'Using pg_stat_activity for connections and long-running queries, database sizes, and indexing with its write overhead in mind.',
    answer: [
      '**Useful monitoring queries**',
      '**Indexes:** Indexes improve query performance.',
      "Don't create indexes blindly. Indexes consume storage and can add overhead to `INSERT`, `UPDATE`, and `DELETE`.",
    ],
    code: [
      {
        title: 'Useful monitoring queries — Check active connections',
        language: 'text',
        code: `SELECT count(*)
FROM pg_stat_activity;`,
      },
      {
        title: 'Useful monitoring queries — See current connections',
        language: 'text',
        code: `SELECT pid, usename, datname, client_addr, state
FROM pg_stat_activity;`,
      },
      {
        title: 'Useful monitoring queries — Find long-running queries',
        language: 'text',
        code: `SELECT pid,
       now() - query_start AS duration,
       query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;`,
      },
      {
        title: 'Useful monitoring queries — Check database sizes',
        language: 'text',
        code: `SELECT datname,
       pg_size_pretty(pg_database_size(datname))
FROM pg_database;`,
      },
      {
        title: 'Indexes',
        language: 'text',
        code: `CREATE INDEX idx_employee_department
ON employees(department);`,
      },
    ],
    tags: ['postgresql', 'monitoring', 'indexes'],
  },
  {
    id: 'itv-rsim-21',
    level: 'basic',
    kind: 'open',
    prompt:
      'How does PostgreSQL compare with MySQL, and which PostgreSQL topics matter most for a DevOps interview?',
    probing:
      'A balanced comparison without claiming one is universally better, and the operational topics a DevOps engineer is expected to know.',
    answer: [
      '**PostgreSQL vs MySQL**',
      '- **PostgreSQL**: Open-source relational DB; **MySQL**: Open-source relational DB\n- **PostgreSQL**: Strong SQL compliance; **MySQL**: Widely used relational DB\n- **PostgreSQL**: Advanced data types/features; **MySQL**: Generally simpler to operate\n- **PostgreSQL**: Strong support for complex queries; **MySQL**: Common for web applications\n- **PostgreSQL**: Excellent extensibility; **MySQL**: Large ecosystem',
      'Don\'t claim that one is universally "better." The choice depends on application requirements.',
      '**Most important PostgreSQL topics for a DevOps interview**',
      '- PostgreSQL architecture\n- Port 5432\n- Database/schema/table\n- Users and permissions\n- Backup and restore\n- HA and replication\n- Connection pooling\n- `pg_stat_activity`\n- Indexes and slow queries\n- AKS → PostgreSQL connectivity\n- Private Endpoint and Private DNS\n- Firewall/network troubleshooting\n- Azure PostgreSQL monitoring\n- RPO/RTO and DR',
    ],
    tags: ['postgresql', 'mysql', 'revision'],
  },
  {
    id: 'itv-rsim-22',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'An application is running in AKS, but it cannot connect to PostgreSQL. How will you troubleshoot it?',
    probing:
      'A layer-by-layer sequence from application config and DNS to network path, authentication and database health, without restarting pods first.',
    answer: [
      "For an interview, answer this in a **layer-by-layer troubleshooting sequence**. Don't immediately assume PostgreSQL itself is down.",
      '**Sample answer:** "If an application running in AKS cannot connect to PostgreSQL, I troubleshoot from the **application layer down to the database layer**.',
      'First, I check whether the application pods are running and look at the **application logs** for the exact error, such as connection timeout, connection refused, authentication failure, or DNS resolution failure.',
      'Next, I verify the **PostgreSQL hostname and port** in the application configuration. PostgreSQL normally uses port 5432.',
      'Then I test **DNS resolution** from inside the AKS pod to make sure the PostgreSQL hostname resolves to the expected IP address.',
      'After that, I test **network connectivity** from the pod to port 5432. If DNS works but port 5432 is unreachable, I investigate the network path, such as NSGs, firewall rules, Private Endpoint, routing, or NetworkPolicy.',
      'If network connectivity is working, I test **PostgreSQL authentication** using the same credentials and database name. I check whether the user has permission to access the database.',
      'Then I check **PostgreSQL itself**. I verify whether the database is available, whether there are too many connections, and whether there are any resource or service issues.',
      'Finally, after identifying and fixing the issue, I restart or redeploy the application only if required and perform an **end-to-end connectivity test**."',
      '**Step 2: Verify configuration**',
      'Check how the application gets its DB configuration:',
      "Don't print the actual password in logs.",
      '**Step 3: Test DNS from the pod:** If DNS fails, investigate the Private DNS Zone, DNS configuration, or the hostname.',
      '**Step 5: Test the actual PostgreSQL connection**',
      'This helps distinguish **network connectivity** problems from **authentication/database** problems.',
      '**Step 6: Check PostgreSQL**',
      'Also check (Check PostgreSQL):',
      '- PostgreSQL service/instance health\n- `max_connections`\n- CPU and memory\n- Storage\n- Firewall rules\n- Database/user permissions\n- Long-running queries',
      '**Step 7: If Azure Private Endpoint is used**',
      'This is particularly important in an AKS + Azure PostgreSQL architecture.',
      'Verify that the PostgreSQL hostname resolves to the **private IP**, not an unexpected public IP.',
      '**Strong closing statement**',
      '"I don\'t start by restarting the pods. First I identify whether the problem is **application configuration, DNS, network connectivity, authentication, or PostgreSQL health**. Once I isolate the layer causing the failure, I fix that specific issue and then validate end-to-end connectivity."',
    ],
    followUps: [
      'How do you confirm the hostname resolves to the private endpoint IP?',
      'How does psql help separate network from authentication problems?',
    ],
    code: [
      {
        title: 'Troubleshooting flow',
        language: 'text',
        code: `AKS Pod
   |
   | 1. Application logs
   ↓
Configuration
   |
   | 2. Hostname / Port / Credentials
   ↓
DNS
   |
   | 3. Does PostgreSQL hostname resolve?
   ↓
Network
   |
   | 4. Can pod reach TCP 5432?
   ↓
Private Endpoint / NSG / Firewall / NetworkPolicy
   |
   | 5. Is traffic allowed?
   ↓
PostgreSQL
   |
   | 6. Authentication / permissions
   ↓
Database health
   |
   | 7. Connections / resources / queries
   ↓
Application`,
      },
      {
        title: 'Step 1: Check pods and logs',
        language: 'bash',
        code: `kubectl get pods -n <namespace>
kubectl logs <pod-name> -n <namespace>`,
      },
      {
        title: 'Check pods and logs — Look for errors such as',
        language: 'text',
        code: `connection timed out
connection refused
password authentication failed
could not translate host name
too many connections`,
      },
      {
        title: 'Step 2: Verify configuration',
        language: 'text',
        code: `DB_HOST
DB_PORT
DB_NAME
DB_USERNAME
DB_PASSWORD`,
      },
      {
        title: 'Verify configuration — For example',
        language: 'text',
        code: `DB_HOST=postgres.example.com
DB_PORT=5432`,
      },
      {
        title: 'Step 3: Test DNS from the pod',
        language: 'bash',
        code: `kubectl exec -it <pod-name> -n <namespace> -- nslookup <postgres-host>`,
      },
      {
        title: 'Step 4: Test port 5432',
        language: 'bash',
        code: `kubectl exec -it <pod-name> -n <namespace> -- nc -zv <postgres-host> 5432`,
      },
      {
        title: 'If it fails, investigate this network path',
        language: 'text',
        code: `AKS
 ↓
NSG
 ↓
Route
 ↓
Private Endpoint / Firewall
 ↓
PostgreSQL`,
      },
      {
        title: 'Test the actual PostgreSQL connection — If psql is available',
        language: 'bash',
        code: `psql -h <postgres-host> \\
     -p 5432 \\
     -U <username> \\
     -d <database>`,
      },
      {
        title: 'Check PostgreSQL — Check active connections',
        language: 'text',
        code: `SELECT count(*)
FROM pg_stat_activity;`,
      },
      {
        title: 'Check PostgreSQL — Check connection details',
        language: 'text',
        code: `SELECT pid, usename, datname, client_addr, state
FROM pg_stat_activity;`,
      },
      {
        title: 'Step 7: If Azure Private Endpoint is used',
        language: 'text',
        code: `AKS
 ↓
Private DNS
 ↓
PostgreSQL FQDN
 ↓
Private IP
 ↓
Private Endpoint
 ↓
Azure PostgreSQL`,
      },
    ],
    tags: ['postgresql', 'aks', 'troubleshooting', 'private endpoint'],
  },
]

-- HR: departments and employees.
-- employees.manager_id points at another employee (NULL for the CEO), which
-- makes this the dataset for self joins and recursive CTEs.

CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL
);

INSERT INTO departments (id, name, location) VALUES
  (1, 'Engineering', 'London'),
  (2, 'Sales', 'New York'),
  (3, 'Marketing', 'London'),
  (4, 'Finance', 'Dublin'),
  (5, 'HR', 'Dublin'),
  (6, 'Support', 'Bangalore');

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department_id INTEGER REFERENCES departments (id),
  manager_id INTEGER REFERENCES employees (id),
  title TEXT NOT NULL,
  salary INTEGER NOT NULL,
  hire_date TEXT NOT NULL
);

INSERT INTO employees (id, name, department_id, manager_id, title, salary, hire_date) VALUES
  (1, 'Asha Rao', 1, NULL, 'Chief Executive', 250000, '2015-03-01'),
  (2, 'Ben Carter', 1, 1, 'VP Engineering', 190000, '2016-06-15'),
  (3, 'Chen Wei', 1, 2, 'Engineering Manager', 150000, '2017-09-01'),
  (4, 'Divya Nair', 1, 3, 'Senior Engineer', 135000, '2018-01-10'),
  (5, 'Ethan Brooks', 1, 3, 'Senior Engineer', 135000, '2019-04-22'),
  (6, 'Farah Khan', 1, 3, 'Engineer', 98000, '2021-07-05'),
  (7, 'Gopal Iyer', 1, 3, 'Engineer', 155000, '2022-02-14'),
  (8, 'Hannah Lee', 2, 1, 'VP Sales', 170000, '2016-11-01'),
  (9, 'Ivan Petrov', 2, 8, 'Account Executive', 92000, '2019-08-19'),
  (10, 'Julia Santos', 2, 8, 'Account Executive', 97000, '2020-03-02'),
  (11, 'Kenji Mori', 2, 8, 'Sales Engineer', 120000, '2021-10-11'),
  (12, 'Lina Haddad', 3, 1, 'Marketing Director', 140000, '2017-05-08'),
  (13, 'Marco Rossi', 3, 12, 'Content Lead', 82000, '2020-09-14'),
  (14, 'Nadia Ali', 3, 12, 'Designer', 78000, '2022-06-27'),
  (15, 'Omar Farouk', 4, 1, 'CFO', 180000, '2016-01-18'),
  (16, 'Priya Shah', 4, 15, 'Financial Analyst', 88000, '2021-01-04'),
  (17, 'Quinn Murphy', 4, 15, 'Accountant', 76000, '2023-03-20'),
  (18, 'Rosa Diaz', 5, 1, 'HR Manager', 95000, '2018-08-30'),
  (19, 'Sam Okafor', 5, 18, 'Recruiter', 64000, '2023-09-11'),
  (20, 'Tara Singh', NULL, 1, 'Executive Assistant', 70000, '2019-12-02');

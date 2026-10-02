-- Shop: customers, products, orders and order lines.
-- Two customers share an email address (for duplicate-finding questions) and
-- some customers have never ordered (for anti-joins).

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  signup_date TEXT NOT NULL
);

INSERT INTO customers (id, name, email, city, country, signup_date) VALUES
  (1, 'Acme Ltd', 'buyer@acme.example', 'London', 'UK', '2025-01-05'),
  (2, 'Blue Fin', 'orders@bluefin.example', 'Dublin', 'Ireland', '2025-01-12'),
  (3, 'Cobalt Labs', 'hello@cobalt.example', 'Berlin', 'Germany', '2025-02-01'),
  (4, 'Delta Retail', 'po@delta.example', 'Paris', 'France', '2025-02-14'),
  (5, 'Echo Media', 'ops@echo.example', 'London', 'UK', '2025-03-03'),
  (6, 'Fjord Foods', 'buy@fjord.example', 'Oslo', 'Norway', '2025-03-20'),
  (7, 'Granite Co', 'acct@granite.example', 'Berlin', 'Germany', '2025-04-02'),
  (8, 'Helix Bio', 'lab@helix.example', 'Basel', 'Switzerland', '2025-04-18'),
  (9, 'Iris Studio', 'studio@iris.example', 'Paris', 'France', '2025-05-07'),
  (10, 'Juniper AI', 'team@juniper.example', 'Dublin', 'Ireland', '2025-05-30'),
  (11, 'Acme Limited', 'buyer@acme.example', 'Manchester', 'UK', '2025-06-11'),
  (12, 'Kite Travel', 'trips@kite.example', 'Lisbon', 'Portugal', '2025-06-25');

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL
);

INSERT INTO products (id, name, category, price) VALUES
  (1, 'Laptop Pro 14', 'Hardware', 1800.00),
  (2, 'USB-C Dock', 'Hardware', 220.00),
  (3, '4K Monitor', 'Hardware', 450.00),
  (4, 'Cloud Backup (1 yr)', 'Software', 120.00),
  (5, 'Office Suite (1 yr)', 'Software', 99.00),
  (6, 'Security Suite (1 yr)', 'Software', 149.00),
  (7, 'Onsite Setup', 'Services', 300.00),
  (8, 'Training Day', 'Services', 650.00);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers (id),
  order_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('placed', 'shipped', 'delivered', 'cancelled'))
);

INSERT INTO orders (id, customer_id, order_date, status) VALUES
  (1, 1, '2025-07-01', 'delivered'),
  (2, 2, '2025-07-01', 'delivered'),
  (3, 1, '2025-07-03', 'delivered'),
  (4, 3, '2025-07-04', 'cancelled'),
  (5, 4, '2025-07-06', 'delivered'),
  (6, 1, '2025-07-09', 'delivered'),
  (7, 5, '2025-07-10', 'delivered'),
  (8, 2, '2025-07-15', 'shipped'),
  (9, 6, '2025-07-18', 'delivered'),
  (10, 1, '2025-07-22', 'delivered'),
  (11, 7, '2025-08-02', 'delivered'),
  (12, 3, '2025-08-05', 'delivered'),
  (13, 4, '2025-08-05', 'delivered'),
  (14, 8, '2025-08-11', 'delivered'),
  (15, 2, '2025-08-14', 'delivered'),
  (16, 5, '2025-08-20', 'cancelled'),
  (17, 1, '2025-08-21', 'delivered'),
  (18, 9, '2025-08-28', 'delivered'),
  (19, 3, '2025-09-02', 'delivered'),
  (20, 4, '2025-09-03', 'shipped'),
  (21, 7, '2025-09-09', 'delivered'),
  (22, 2, '2025-09-12', 'delivered'),
  (23, 8, '2025-09-15', 'placed'),
  (24, 11, '2025-09-18', 'delivered'),
  (25, 6, '2025-09-22', 'delivered'),
  (26, 3, '2025-09-25', 'placed'),
  (27, 1, '2025-09-29', 'placed'),
  (28, 5, '2025-09-30', 'placed');

CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders (id),
  product_id INTEGER NOT NULL REFERENCES products (id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  PRIMARY KEY (order_id, product_id)
);

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 2, 1800.00), (1, 2, 2, 220.00),
  (2, 4, 10, 120.00),
  (3, 3, 4, 450.00), (3, 7, 1, 300.00),
  (4, 1, 1, 1800.00),
  (5, 5, 25, 99.00), (5, 6, 25, 149.00),
  (6, 8, 1, 650.00),
  (7, 1, 3, 1750.00), (7, 3, 3, 450.00),
  (8, 4, 5, 120.00), (8, 5, 5, 99.00),
  (9, 2, 6, 220.00),
  (10, 6, 40, 140.00),
  (11, 1, 1, 1800.00), (11, 7, 1, 300.00),
  (12, 8, 2, 650.00),
  (13, 3, 2, 450.00),
  (14, 4, 20, 115.00), (14, 6, 20, 149.00),
  (15, 1, 5, 1700.00),
  (16, 2, 1, 220.00),
  (17, 5, 12, 99.00),
  (18, 3, 1, 450.00), (18, 2, 1, 220.00),
  (19, 7, 2, 300.00), (19, 8, 1, 650.00),
  (20, 1, 2, 1800.00),
  (21, 6, 15, 149.00),
  (22, 4, 8, 120.00),
  (23, 1, 1, 1800.00),
  (24, 5, 30, 95.00),
  (25, 3, 2, 450.00), (25, 2, 2, 220.00),
  (26, 4, 3, 120.00),
  (27, 8, 3, 650.00),
  (28, 1, 1, 1800.00);

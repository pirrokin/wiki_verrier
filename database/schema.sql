CREATE DATABASE IF NOT EXISTS technician_wiki;

USE technician_wiki;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- In real app, we hash this!
    role ENUM('admin', 'technician') DEFAULT 'technician',
    firstname VARCHAR(100),
    lastname VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    birthdate DATE,
    gender ENUM('M', 'F', 'Other'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS processes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    title VARCHAR(255) NOT NULL,
    file_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Insert a test user
-- Username: admin, Password: password123
INSERT INTO users (username, password, role) VALUES 
('admin', 'admin123', 'admin')
ON DUPLICATE KEY UPDATE username=username;

INSERT INTO categories (name) VALUES ('Office'), ('Atelier') ON DUPLICATE KEY UPDATE name=name;

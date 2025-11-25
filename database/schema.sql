CREATE DATABASE IF NOT EXISTS technician_wiki;

USE technician_wiki;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- In real app, we hash this!
    role ENUM('admin', 'technician') DEFAULT 'technician',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert a test user
-- Username: admin, Password: password123
INSERT INTO users (username, password, role) VALUES 
('admin', 'password123', 'admin')
ON DUPLICATE KEY UPDATE id=id;

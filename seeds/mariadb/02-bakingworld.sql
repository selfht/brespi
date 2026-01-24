-- Create bakingworld database
CREATE DATABASE IF NOT EXISTS bakingworld;

USE bakingworld;

-- Create recipes table
CREATE TABLE recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20),
    prep_time_minutes INT,
    bake_time_minutes INT,
    servings INT
);

-- Insert sample recipes
INSERT INTO recipes (name, category, difficulty, prep_time_minutes, bake_time_minutes, servings) VALUES
    ('Chocolate Chip Cookies', 'Cookies', 'Easy', 15, 12, 24),
    ('Sourdough Bread', 'Bread', 'Hard', 30, 45, 1),
    ('New York Cheesecake', 'Cake', 'Medium', 25, 60, 12),
    ('French Baguette', 'Bread', 'Medium', 20, 25, 2),
    ('Blueberry Muffins', 'Muffins', 'Easy', 10, 20, 12),
    ('Red Velvet Cake', 'Cake', 'Medium', 30, 30, 16),
    ('Cinnamon Rolls', 'Pastry', 'Medium', 40, 25, 12),
    ('Apple Pie', 'Pie', 'Medium', 30, 50, 8),
    ('Croissants', 'Pastry', 'Hard', 60, 20, 8),
    ('Brownies', 'Dessert', 'Easy', 15, 25, 16);

-- Create ingredients table
CREATE TABLE ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    unit VARCHAR(20),
    cost_per_unit DECIMAL(10, 2)
);

-- Insert sample ingredients
INSERT INTO ingredients (name, category, unit, cost_per_unit) VALUES
    ('All-Purpose Flour', 'Grain', 'lb', 2.49),
    ('Granulated Sugar', 'Sweetener', 'lb', 1.99),
    ('Brown Sugar', 'Sweetener', 'lb', 2.29),
    ('Butter', 'Dairy', 'lb', 4.99),
    ('Eggs', 'Dairy', 'dozen', 3.99),
    ('Vanilla Extract', 'Flavoring', 'oz', 0.89),
    ('Baking Powder', 'Leavening', 'oz', 0.15),
    ('Salt', 'Seasoning', 'lb', 0.99),
    ('Chocolate Chips', 'Add-in', 'oz', 0.25),
    ('Milk', 'Dairy', 'gallon', 3.79);

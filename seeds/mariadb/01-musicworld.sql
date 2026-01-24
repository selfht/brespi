-- Create musicworld database
CREATE DATABASE IF NOT EXISTS musicworld;

USE musicworld;

-- Create instruments table
CREATE TABLE instruments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2),
    manufacturer VARCHAR(100),
    year_introduced INT
);

-- Insert sample data
INSERT INTO instruments (name, category, price, manufacturer, year_introduced) VALUES
    ('Fender Stratocaster', 'Electric Guitar', 1299.99, 'Fender', 1954),
    ('Gibson Les Paul', 'Electric Guitar', 2499.99, 'Gibson', 1952),
    ('Yamaha P-125', 'Digital Piano', 649.99, 'Yamaha', 2018),
    ('Roland TD-17KV', 'Electronic Drums', 1699.99, 'Roland', 2019),
    ('Shure SM58', 'Microphone', 99.99, 'Shure', 1966),
    ('Korg Minilogue XD', 'Synthesizer', 649.99, 'Korg', 2019),
    ('Fender Precision Bass', 'Bass Guitar', 1449.99, 'Fender', 1951),
    ('Moog Subsequent 37', 'Synthesizer', 1599.99, 'Moog', 2016),
    ('Pearl Export Series', 'Acoustic Drums', 899.99, 'Pearl', 2000),
    ('Akai MPK Mini', 'MIDI Controller', 119.99, 'Akai', 2011);

-- Create artists table
CREATE TABLE artists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    genre VARCHAR(50),
    country VARCHAR(50),
    formed_year INT
);

-- Insert sample artists
INSERT INTO artists (name, genre, country, formed_year) VALUES
    ('The Beatles', 'Rock', 'United Kingdom', 1960),
    ('Miles Davis', 'Jazz', 'United States', 1944),
    ('Daft Punk', 'Electronic', 'France', 1993),
    ('Radiohead', 'Alternative Rock', 'United Kingdom', 1985),
    ('Billie Eilish', 'Pop', 'United States', 2015);

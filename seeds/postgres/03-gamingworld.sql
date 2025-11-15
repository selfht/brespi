-- Create gamingworld database
CREATE DATABASE gamingworld;

\c gamingworld;

-- Create games table
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    genre VARCHAR(50) NOT NULL,
    platform VARCHAR(50),
    release_year INTEGER,
    publisher VARCHAR(100),
    rating DECIMAL(3, 1)
);

-- Insert sample games
INSERT INTO games (title, genre, platform, release_year, publisher, rating) VALUES
    ('The Legend of Zelda: Breath of the Wild', 'Action-Adventure', 'Nintendo Switch', 2017, 'Nintendo', 9.7),
    ('The Witcher 3: Wild Hunt', 'RPG', 'Multi-platform', 2015, 'CD Projekt', 9.3),
    ('Minecraft', 'Sandbox', 'Multi-platform', 2011, 'Mojang', 9.0),
    ('Dark Souls III', 'Action RPG', 'Multi-platform', 2016, 'Bandai Namco', 8.8),
    ('Hades', 'Roguelike', 'Multi-platform', 2020, 'Supergiant Games', 9.1),
    ('Portal 2', 'Puzzle', 'Multi-platform', 2011, 'Valve', 9.5),
    ('Hollow Knight', 'Metroidvania', 'Multi-platform', 2017, 'Team Cherry', 9.2),
    ('Stardew Valley', 'Simulation', 'Multi-platform', 2016, 'ConcernedApe', 9.0),
    ('Elden Ring', 'Action RPG', 'Multi-platform', 2022, 'Bandai Namco', 9.5),
    ('Celeste', 'Platformer', 'Multi-platform', 2018, 'Maddy Makes Games', 8.9);

-- Create platforms table
CREATE TABLE platforms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(50),
    release_year INTEGER,
    generation INTEGER
);

-- Insert sample platforms
INSERT INTO platforms (name, manufacturer, release_year, generation) VALUES
    ('PlayStation 5', 'Sony', 2020, 9),
    ('Xbox Series X', 'Microsoft', 2020, 9),
    ('Nintendo Switch', 'Nintendo', 2017, 8),
    ('PC', 'Various', NULL, NULL),
    ('Steam Deck', 'Valve', 2022, 9);

-- Create genres table
CREATE TABLE genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT
);

-- Insert sample genres
INSERT INTO genres (name, description) VALUES
    ('RPG', 'Role-playing games where players control characters in a fictional setting'),
    ('Action-Adventure', 'Games combining action gameplay with adventure story elements'),
    ('Platformer', 'Games featuring jumping and climbing challenges'),
    ('Puzzle', 'Games focused on solving logical challenges'),
    ('Simulation', 'Games that simulate real-world activities'),
    ('Roguelike', 'Games with procedural generation and permanent death mechanics');

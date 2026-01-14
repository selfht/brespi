-- Custom SQL migration file, put your code below! --
create table schedule_metadata (
    id text primary key,
    active integer not null,
);

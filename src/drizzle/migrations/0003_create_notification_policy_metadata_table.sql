-- Custom SQL migration file, put your code below! --
create table notification_policy_metadata (
    id text primary key,
    active integer not null
);

-- Custom SQL migration file, put your code below! --
create table execution (
    id text primary key,
    pipeline_id text not null,
    started_at text not null,
    result_outcome text,
    result_duration_ms integer,
    result_completed_at text
);

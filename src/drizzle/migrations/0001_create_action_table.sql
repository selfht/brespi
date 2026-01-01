-- Custom SQL migration file, put your code below! --
create table action (
    id text primary key,
    execution_id text not null references execution(id) on delete cascade,
    step_id text not null,
    step_type text not null,
    previous_step_id text,
    started_at text,
    result_outcome text,
    result_duration_ms integer,
    result_completed_at text,
    result_artifacts_consumed text check(json_valid(result_artifacts_consumed)),
    result_artifacts_produced text check(json_valid(result_artifacts_produced)),
    result_error_message text
);

export const Route = {
  pipelines(id?: string) {
    return id ? `pipelines/${id}` : "pipelines";
  },
  schedules() {
    return "schedules";
  },
  notifications() {
    return "notifications";
  },
  configuration() {
    return "configuration";
  },
};

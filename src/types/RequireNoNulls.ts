type RequireNoNulls<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};

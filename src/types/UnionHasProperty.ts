type HasProperty<T, K extends string | number | symbol> = T extends any ? (K extends keyof T ? true : false) : never;

export type UnionHasProperty<T, K extends string | number | symbol> = true extends HasProperty<T, K> ? true : false;

import { useEffect, useRef, useState } from "react";

type Maybe<T> = T | undefined;

export function useYesQuery<D, E = unknown>(
  { queryFn, initialData }: useYesQuery.Options<D>,
  queryFnDependencies = [] as unknown[],
): useYesQuery.Result<D, E> {
  const internalDataRef = useRef<Maybe<D>>(initialData);
  const internalErrorRef = useRef<Maybe<E>>(undefined);
  const [internalData, setInternalData] = useState<Maybe<D>>(initialData);
  const [internalError, setInternalError] = useState<Maybe<E>>(undefined);

  function setData(data: Maybe<D>) {
    internalDataRef.current = data;
    setInternalData(data);
  }

  function setError(error: Maybe<E>) {
    internalErrorRef.current = error;
    setInternalError(error);
  }

  async function reload(): Promise<Maybe<D>> {
    try {
      const data = await queryFn();
      internalDataRef.current = data;
      setInternalData(data);
      return data;
    } catch (e) {
      internalErrorRef.current = e as E;
      setInternalError(e as E);
      throw e;
    }
  }
  useEffect(() => {
    reload().catch((_ignored) => {});
  }, queryFnDependencies);

  return {
    data: internalData,
    error: internalError,
    reload,
    getData: () => internalDataRef.current,
    setData,
    getError: () => internalErrorRef.current,
    setError,
  };
}

export namespace useYesQuery {
  export type Options<D> = {
    queryFn: () => Maybe<D> | Promise<Maybe<D>>;
    initialData?: Maybe<D>;
  };
  export type Result<D, E = unknown> = {
    data: Maybe<D>;
    error: Maybe<E>;
    reload(): Promise<Maybe<D>>;
    getData(): Maybe<D>;
    setData(data: Maybe<D>): void;
    getError(): Maybe<E>;
    setError(error: Maybe<E>): void;
  };
}

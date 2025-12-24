import { SetStateAction, useRef, useState } from "react";

export function useStateRef<T>(initialValue?: T) {
  const [value, setValue] = useState(initialValue);
  const valueRef = useRef(initialValue);
  function setValueAndRef(action: SetStateAction<T | undefined>) {
    if (typeof action === "function") {
      type ActionFn = (x: T | undefined) => T | undefined;
      setValue((oldValue) => {
        const newValue = (action as ActionFn)(oldValue);
        valueRef.current = newValue;
        return newValue;
      });
    } else {
      valueRef.current = action;
      setValue(action);
    }
  }
  return [value, valueRef, setValueAndRef] as const;
}

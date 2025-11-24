import { Temporal } from "@js-temporal/polyfill";
import clsx from "clsx";
import { JSX } from "react";

type Props = JSX.IntrinsicElements["main"];
export function Skeleton(props: Props) {
  return (
    <>
      <Skeleton.Header />
      <Skeleton.Main {...props} />
      <Skeleton.Footer />
    </>
  );
}

export namespace Skeleton {
  export function Header() {
    return (
      <header className="u-root-grid-minus-gutters u-subgrid py-8">
        <h1 className="col-span-full text-center">Brespi</h1>
      </header>
    );
  }

  export function Main(props: Props) {
    return <main {...props} className={clsx("u-root-grid-minus-gutters u-subgrid py-4", props.className)} />;
  }

  export function Footer() {
    const currentDate = Temporal.Now.plainDateISO();
    return (
      <footer className="u-root-grid-minus-gutters u-subgrid">
        <div className="opacity-30 py-10 text-right col-start-2 col-span-9 ">Brespi • {currentDate.year}</div>
      </footer>
    );
  }
}

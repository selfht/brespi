import { Temporal } from "@js-temporal/polyfill";
import clsx from "clsx";
import { JSX } from "react";
import { Paper } from "./Paper";
import { Link } from "react-router";
import { useLocation } from "react-router";

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
  type NavigationLink = {
    title: string;
    link: string;
    rounding: "left" | "right" | undefined;
  };

  export function Header() {
    const { pathname } = useLocation();
    const navigationLinks: NavigationLink[] = [
      { title: "Pipelines", link: "", rounding: "left" },
      { title: "Schedules", link: "schedules", rounding: undefined },
      { title: "Configuration", link: "configuration", rounding: "right" },
    ];

    return (
      <Paper className="u-root-grid-minus-gutters">
        <nav className="flex">
          {navigationLinks.map(({ title, link, rounding }, index, { length }) => (
            <Link
              key={title}
              to={link}
              className={clsx("p-6 hover:bg-c-dim/30", {
                "rounded-l-2xl": rounding === "left",
                "rounded-r-2xl": rounding === "right",
                "bg-c-dim/20": pathname === link || pathname === `${link}/`,
                "ml-auto": index + 1 === length,
              })}
            >
              <span className="relative">
                {title}
                {index + 1 === length && <div className="absolute rounded-full size-3 bg-c-error -right-2 -top-2" />}
              </span>
            </Link>
          ))}
        </nav>
      </Paper>
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

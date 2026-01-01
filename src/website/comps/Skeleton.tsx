import { Temporal } from "@js-temporal/polyfill";
import clsx from "clsx";
import { JSX } from "react";
import { Link, useLocation } from "react-router";
import { useConfigurationStatus } from "../hooks/useConfigurationStatus";
import { Paper } from "./Paper";

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
    const { pathname } = useLocation();
    const { synchronized } = useConfigurationStatus();

    const navigationLinks = [
      { title: "Pipelines", link: "/pipelines", rounding: "left" },
      { title: "Schedules", link: "/schedules", rounding: undefined },
      { title: "Policies", link: "/policies", rounding: undefined },
      { title: "Configuration", link: "/configuration", rounding: "right" },
    ] as const;

    return (
      <Paper className="u-root-grid-minus-gutters mt-10">
        <nav className="flex">
          {navigationLinks.map(({ title, link, rounding }) => (
            <Link
              key={title}
              to={link}
              className={clsx("p-6 hover:bg-c-dim/30", {
                "rounded-l-2xl": rounding === "left",
                "rounded-r-2xl": rounding === "right",
                "bg-c-dim/20": pathname.startsWith(link),
                "ml-auto": title === "Configuration",
              })}
            >
              <span className="relative text-lg">
                {title}
                {title === "Configuration" && !synchronized && (
                  <div data-testid="conf-out-of-sync" className="absolute rounded-full size-2 bg-c-error -right-2 -top-1" />
                )}
              </span>
            </Link>
          ))}
        </nav>
      </Paper>
    );
  }

  export function Main(props: Props) {
    return <main {...props} className={clsx("u-root-grid-minus-gutters u-subgrid mt-12", props.className)} />;
  }

  export function Footer() {
    const currentDate = Temporal.Now.plainDateISO();
    return <footer className="u-root-grid-minus-gutters my-12 text-center text-4xl font-extrabold italic text-c-dark">Brespi</footer>;
  }
}

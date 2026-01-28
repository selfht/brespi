import clsx from "clsx";
import { ComponentProps } from "react";
import { Link, useLocation } from "react-router";
import { RestrictedClient } from "../clients/RestrictedClient";
import { useConfiguration } from "../hooks/useConfiguration";
import { useRegistry } from "../hooks/useRegistry";
import { Paper } from "./Paper";

type Props = ComponentProps<"main">;
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
    const { data } = useConfiguration();

    const navigationLinks = [
      { title: "Pipelines", link: "/pipelines", rounding: "left" },
      { title: "Schedules", link: "/schedules", rounding: undefined },
      { title: "Notifications", link: "/notifications", rounding: undefined },
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
                {title === "Configuration" && data && !data.synchronized && (
                  <div
                    data-testid="conf-out-of-sync"
                    className="absolute rounded-full size-4 border-2 border-c-dark bg-c-error -right-3 -top-1"
                  />
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
    const { O_BRESPI_STAGE, O_BRESPI_VERSION, O_BRESPI_COMMIT } = useRegistry("env");
    const restrictedClient = useRegistry(RestrictedClient);
    const purge = () => restrictedClient.purge().then(() => location.reload());
    const seed = () => restrictedClient.seed().then(() => location.reload());
    return (
      <footer className="u-root-grid-minus-gutters my-12 flex flex-col items-center gap-4">
        <div className="text-4xl font-extrabold italic text-c-dark">Brespi</div>
        <div className="font-mono text-c-dim/60">
          v{O_BRESPI_VERSION} / {O_BRESPI_COMMIT.slice(0, 7)}
        </div>
        {O_BRESPI_STAGE === "development" && (
          <div className="flex gap-4">
            <button onClick={seed} className="cursor-pointer text-c-dark border border-c-dark hover:bg-c-dark/10 p-2 rounded-lg">
              Seed
            </button>
            <button onClick={purge} className="cursor-pointer text-c-dark border border-c-dark hover:bg-c-dark/10 p-2 rounded-lg">
              Purge
            </button>
          </div>
        )}
      </footer>
    );
  }
}

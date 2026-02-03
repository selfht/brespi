import clsx from "clsx";
import { cloneElement, JSX } from "react";
import closeSvg from "../images/close.svg";
import errorSvg from "../images/error.svg";
import newSvg from "../images/new.svg";
import playSvg from "../images/play.svg";
import successSvg from "../images/success.svg";
import trashcanSvg from "../images/trashcan.svg";
import { Spinner } from "./Spinner";

type V = Icon.Props["variant"];
const images: Record<V, JSX.Element> = {
  success: <img src={successSvg} />,
  error: <img src={errorSvg} />,
  new: <img src={newSvg} />,
  play: <img src={playSvg} />,
  trashcan: <img src={trashcanSvg} />,
  close: <img src={closeSvg} />,
  loading: <Spinner />,
};

export function Icon({ variant, className }: Icon.Props) {
  return cloneElement(images[variant], {
    className: clsx(
      {
        "rounded-full bg-black": ["new" satisfies V, "error" satisfies V, "success" satisfies V].includes(variant),
      },
      className,
    ),
  });
}

export namespace Icon {
  export type Props = {
    variant: "success" | "error" | "new" | "play" | "trashcan" | "close" | "loading";
    className?: string;
  };

  type TriangleProps = {
    className?: string;
    innerClassName?: string;
  };
  export function Triangle({ className, innerClassName }: TriangleProps) {
    return (
      <svg viewBox="0 0 16 22" className={clsx("size-5", className)}>
        <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
          <path
            d="M9.43194737,5.36747792 L16.5646486,15.2434351 C17.534727,16.5866082 17.2322739,18.461869 15.8891008,19.4319474 C15.3778573,19.8011822 14.7632566,19.9999173 14.1326186,19.9999173 L-0.132783887,19.9999173 C-1.78963814,19.9999173 -3.13278389,18.6567716 -3.13278389,16.9999173 C-3.13278389,16.3692794 -2.93404873,15.7546786 -2.56481392,15.2434351 L4.56788732,5.36747792 C5.53796568,4.02430483 7.41322651,3.72185179 8.75639961,4.69193016 C9.01622211,4.87958147 9.24429607,5.10765542 9.43194737,5.36747792 Z"
            className={clsx("fill-c-accent", innerClassName)}
            transform="translate(6.9999, 11) rotate(270) translate(-6.9999, -11)"
          />
        </g>
      </svg>
    );
  }

  type NoDataProps = {
    className?: string;
  };
  export function NoData({ className }: NoDataProps) {
    return <div className={clsx("text-center text-sm font-semibold text-c-dim", className)}>NO DATA</div>;
  }
}

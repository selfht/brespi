import { cloneElement, JSX } from "react";
import errorSvg from "../images/error.svg";
import newSvg from "../images/new.svg";
import playSvg from "../images/play.svg";
import successSvg from "../images/success.svg";
import trashcanSvg from "../images/trashcan.svg";
import closeSvg from "../images/close.svg";

const images: Record<Icon.Props["variant"], JSX.Element> = {
  success: <img src={successSvg} />,
  error: <img src={errorSvg} />,
  new: <img src={newSvg} />,
  play: <img src={playSvg} />,
  trashcan: <img src={trashcanSvg} />,
  close: <img src={closeSvg} />,
};

export function Icon({ variant, className }: Icon.Props) {
  return cloneElement(images[variant], { className });
}

export namespace Icon {
  export type Props = {
    variant: "success" | "error" | "new" | "play" | "trashcan" | "close";
    className?: string;
  };
}

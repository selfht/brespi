import { RefObject, useEffect, useRef, useState } from "react";

type Result<T extends HTMLElement> = {
  isFullScreen: boolean;
  toggleFullScreen(): void;
  fullScreenElementRef: RefObject<T | null>;
};
export function useFullScreen<T extends HTMLElement = HTMLDivElement>(): Result<T> {
  const [isFullScreen, setFullScreen] = useState(false);
  const fullScreenElementRef = useRef<T>(null);
  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      await fullScreenElementRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };
  useEffect(() => {
    const handleFullscreenChange = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);
  return {
    isFullScreen,
    toggleFullScreen,
    fullScreenElementRef,
  };
}

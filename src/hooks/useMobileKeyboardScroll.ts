import { useEffect } from "react";

/**
 * On mobile (especially iOS Safari) the virtual keyboard does not resize
 * the viewport, so focused inputs can end up hidden behind the keyboard.
 * This hook listens for focus events on input/textarea elements and
 * scrolls them into the center of the visible area.
 */
export function useMobileKeyboardScroll() {
  useEffect(() => {
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Small delay to let the keyboard fully open
        setTimeout(() => {
          target.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }, 300);
      }
    };

    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, []);
}

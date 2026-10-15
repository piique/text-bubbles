import type { DetailedHTMLProps, HTMLAttributes } from "react";

type TextBubblesElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  [attribute: string]: unknown;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "text-bubbles": TextBubblesElementProps;
    }
  }
}

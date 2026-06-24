/// <reference types="vite/client" />

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}

declare module "*.svg" {
  const content: string;
  export default content;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        poster?: string;
        alt?: string;
        'auto-rotate'?: boolean | string;
        'camera-controls'?: boolean | string;
        'background-color'?: string;
        'shadow-intensity'?: string;
        'interaction-prompt'?: string;
        'auto-rotate-delay'?: number | string;
        'rotation-per-second'?: string;
        style?: React.CSSProperties;
      }, HTMLElement>;
    }
  }
}


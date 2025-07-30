declare module 'epubjs' {
  export interface EpubPackage {
    metadata: {
      title?: string;
      creator?: string;
      description?: string;
      language?: string;
      identifier?: string;
    };
  }

  export interface SpineItem {
    idref: string;
    href: string;
    load: (loader: unknown) => Promise<Document>;
  }

  export interface Spine {
    length: number;
    get: (index: number) => SpineItem;
  }

  export interface Book {
    ready: Promise<void>;
    package: EpubPackage;
    spine: Spine;
    load: {
      bind: (context: unknown) => unknown;
    };
    destroy: () => void;
  }

  function ePub(url: string): Book;
  export = ePub;
}
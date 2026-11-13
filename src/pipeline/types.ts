export interface SlideIR {
  id: string;
  title: string;
  body: string;
  kind: "content" | "section";
  subtitle?: string;
}

export interface BoardIR {
  id: string;
  rawMarkdown: string;
  title: string;
  type: "presentation" | "document";
  subtitle?: string;
  footer?: {
    left?: string;
    right?: string;
  };
  slides: SlideIR[];
}

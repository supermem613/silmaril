export interface SlideIR {
  id: string;
  title: string;
  body: string;
}

export interface BoardIR {
  id: string;
  rawMarkdown: string;
  title: string;
  subtitle?: string;
  footer?: {
    left?: string;
    right?: string;
  };
  slides: SlideIR[];
}

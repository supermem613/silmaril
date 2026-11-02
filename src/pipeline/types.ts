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
  slides: SlideIR[];
}

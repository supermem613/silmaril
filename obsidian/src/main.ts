import { MarkdownView, Plugin } from 'obsidian';
import { SILMARIL_VIEW_TYPE, SilmarilDeckView } from './deckView.js';

export default class SilmarilPlugin extends Plugin {
  private sourceView: MarkdownView | null = null;

  async onload(): Promise<void> {
    this.captureActiveMarkdownView();
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () =>
        this.captureActiveMarkdownView(),
      ),
    );

    this.registerView(
      SILMARIL_VIEW_TYPE,
      (leaf) => new SilmarilDeckView(leaf, () => this.sourceView),
    );

    this.addCommand({
      id: 'open-silmaril-preview',
      name: 'Open Silmaril preview',
      callback: () => this.activateView(),
    });

    this.addRibbonIcon(
      'presentation',
      'Open Silmaril preview',
      () => this.activateView(),
    );
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(SILMARIL_VIEW_TYPE);
  }

  private async activateView(): Promise<void> {
    this.captureActiveMarkdownView();
    const existingLeaf = this.app.workspace.getLeavesOfType(SILMARIL_VIEW_TYPE)[0];
    const leaf =
      existingLeaf ?? this.app.workspace.getLeaf('split', 'vertical');

    if (existingLeaf === undefined) {
      await leaf.setViewState({
        type: SILMARIL_VIEW_TYPE,
        active: true,
      });
    }

    await this.app.workspace.revealLeaf(leaf);
  }

  private captureActiveMarkdownView(): void {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView !== null) {
      this.sourceView = activeView;
    }
  }
}

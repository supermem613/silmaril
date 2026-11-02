import { FileSystemAdapter, MarkdownView, Notice, Plugin } from 'obsidian';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { SILMARIL_VIEW_TYPE, SilmarilDeckView } from './deckView.js';
import { renderPresentationFromMarkdownAsync } from '../../src/pipeline/renderFile.js';

interface ElectronSaveDialog {
  showSaveDialog(options: {
    title?: string;
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<{ canceled: boolean; filePath?: string }>;
}

// The save dialog lives on the main process and is only reachable from the
// renderer through Electron's remote bridge. Newer Electron drops that bridge,
// so this returns null there and the caller writes beside the note instead.
function getElectronSaveDialog(): ElectronSaveDialog | null {
  const dynamicRequire = (window as unknown as { require?: (id: string) => unknown }).require;
  if (typeof dynamicRequire !== 'function') {
    return null;
  }
  try {
    const electron = dynamicRequire('electron') as
      | { remote?: { dialog?: ElectronSaveDialog } }
      | undefined;
    return electron?.remote?.dialog ?? null;
  } catch {
    return null;
  }
}

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

    this.addCommand({
      id: 'publish-silmaril-html',
      name: 'Publish HTML',
      callback: () => {
        void this.publishHtml();
      },
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

  private async publishHtml(): Promise<void> {
    this.captureActiveMarkdownView();
    const view = this.sourceView;
    if (view === null || view.file === null) {
      new Notice('Silmaril: open a Markdown deck before publishing.');
      return;
    }

    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      new Notice('Silmaril requires a desktop file-system vault to publish.');
      return;
    }

    try {
      // Publish the plain standalone deck. renderDeck injects the preview bridge
      // that talks to the Obsidian parent frame, which a saved file must never
      // carry, so this renders directly instead.
      const sourcePath = adapter.getFullPath(view.file.path);
      const { html } = await renderPresentationFromMarkdownAsync(view.editor.getValue(), sourcePath);

      const defaultName = `${view.file.basename}.html`;
      const savedPath = await this.writePublishedDeck(
        html,
        defaultName,
        view.file.path,
        adapter,
      );
      if (savedPath !== null) {
        new Notice(`Silmaril published to ${savedPath}`);
      }
    } catch (error) {
      new Notice(
        `Silmaril publish failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async writePublishedDeck(
    html: string,
    defaultName: string,
    sourceVaultPath: string,
    adapter: FileSystemAdapter,
  ): Promise<string | null> {
    const dialog = getElectronSaveDialog();
    if (dialog !== null) {
      const noteDirectory = dirname(adapter.getFullPath(sourceVaultPath));
      const result = await dialog.showSaveDialog({
        title: 'Publish Silmaril HTML',
        defaultPath: join(noteDirectory, defaultName),
        filters: [{ name: 'HTML', extensions: ['html'] }],
      });
      if (result.canceled || result.filePath === undefined) {
        return null;
      }
      await writeFile(result.filePath, html, 'utf8');
      return result.filePath;
    }

    // Without a native picker, write beside the note so the artifact is always
    // discoverable in the vault.
    const parent = dirname(sourceVaultPath);
    const targetVaultPath = parent === '.' ? defaultName : `${parent}/${defaultName}`;
    await adapter.write(targetVaultPath, html);
    return targetVaultPath;
  }
}

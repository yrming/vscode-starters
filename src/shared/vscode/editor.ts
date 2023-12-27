/// Gets the "active" file:// TextEditor, excluding any output: panes that

import { TextEditor, window } from "vscode";

/// might be in the list.
export function getActiveRealFileEditor(): TextEditor | undefined {
  let editor = window.activeTextEditor;
  // It's possible the "active editor" is actually an Output pane, so
  // try falling back to a single visible (file-scheme) editor if there is one.
  if (editor?.document.uri.scheme !== "file") {
    const fileEditors = window.visibleTextEditors.filter((e) => e.document.uri.scheme === "file");
    if (fileEditors.length === 1) {
      console.log(`Falling back from ${editor?.document.uri} to ${fileEditors[0].document.uri}`);
      editor = fileEditors[0];
    }
  }
  return editor?.document.uri.scheme === "file"
    ? editor
    : undefined;
}

import { commands, ExtensionContext, QuickPickItem, QuickPickItemKind, Uri, window } from "vscode"
import { ProjectTemplate } from "../types"

export async function registerCommands(context: ExtensionContext): Promise<void> {
  commands.registerCommand('starter.create-project', async () => {
    const pickItems = _getTemplates()
    const selectedTemplate = await window.showQuickPick(
      pickItems,
      {
        ignoreFocusOut: true,
        matchOnDescription: true,
        placeHolder: "Which Starter template?",
      },
    );
    if (!selectedTemplate?.template)
      return;
    return _createProjectForTemplate(selectedTemplate.template);
  })
}

function _getTemplates(): Array<QuickPickItem & { template?: ProjectTemplate }> {
  const templates = [
    {
      kind: QuickPickItemKind.Separator,
      label: "Vue",
    },
    {
      detail: "🛠️ The recommended way to start a Vite-powered Vue project",
      label: "Create Vue(Official)",
      template: { id: "create-vue" },
    },
    {
      detail: "⚡️ Nuxt Generation CLI Experience",
      label: "Nuxi(Official)",
      template: { id: "nuxi" },
    },
    {
      detail: "🏕 Opinionated Vite + Vue Starter Template",
      label: "Vitesse(Anthony Fu)",
      template: { id: "vitesse" },
    },
    {
      detail: "⛺️ Lightweight version of Vitesse",
      label: "Vitesse Lite(Anthony Fu)",
      template: { id: "vitesse-lite" },
    },
    {
      detail: "Vitesse for Nuxt 3 🏔💚⚡️",
      label: "Vitesse Nuxt3(Anthony Fu)",
      template: { id: "vitesse-nuxt3" },
    },
    {
      detail: "⚡️ WebExtension Vite Starter Template",
      label: "Vitesse Webext(Anthony Fu)",
      template: { id: "vitesse-webext" },
    },
    {
      kind: QuickPickItemKind.Separator,
      label: "React",
    },
    {
      detail: "Create Next.js-powered React apps with one command",
      label: "Create Next App(Official)",
      template: { id: "create-next-app" },
    },
  ]
  return templates
}

async function _createProjectForTemplate(template: ProjectTemplate): Promise<Uri | undefined> {
  return
}


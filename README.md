<br>
<p align="center">
<img src="resources/icon.png" alt="logo" width="150"/>
</p>

<h1 align="center">
Starters
</h1>

<p align="center">
Kickstart your project with a starter in VSCode
</p>

<p align="center">
<a href="https://marketplace.visualstudio.com/items?itemName=YRM.starter-templates" target="__blank"><img src="https://img.shields.io/visual-studio-marketplace/v/YRM.starter-templates.svg?color=eee&amp;label=VS%20Code%20Marketplace&logo=visual-studio-code" alt="Visual Studio Marketplace Version" /></a>
</p>

## Motivation

- As a front-end developer, everytime before I create a new project, I have to open a terminal, enter some commands recommended in the front-end framework documentation; sometimes I even forget these commands. This whole process apparently needs more efficiency.
- In the process of developing Flutter projects, I found that I could quickly create a Flutter project through the [Dart](https://github.com/Dart-Code/Dart-Code) extension for VSCode, so I developed this extension in order to do the same when creating some front-end projects.

## Features

- Create project from starter template
- Set options for starter template
- Select your preferred package manager
- Enable or disable automatic initialization of Git
- Enable or disable automatic installation of dependencies

## Usage

<p>
<table><tr><td>Run <b><code>Starters: New Project</code></b> command to create your new project</tr></td></table>
</p>

<p align="center">
<img width="800" alt="Preview 1" src="./resources/preview1.png">
</p>
<p align="center">
<img width="800" alt="Preview 2" src="./resources/preview2.png">
</p>

## Settings

```js
{
  "starters.globalSettings.needsGitInit": true,
  "starters.globalSettings.needsInstall": true,
  "starters.globalSettings.packageManager": "pnpm",

  "starters.createVue.needsTypeScript": true,
  "starters.createVue.needsJsx": true,
  "starters.createVue.needsRouter": true,
  "starters.createVue.needsPinia": true,
  "starters.createVue.needsVitest": true,
  "starters.createVue.endToEndTestingSolution": "cypress",
  "starters.createVue.needsEslint": true,
  "starters.createVue.needsPrettier": true,

  "starters.createNextApp.needsTypeScript": true,
  "starters.createNextApp.needsEslint": true,
  "starters.createNextApp.needsTailwind": true,
  "starters.createNextApp.needsSrcDirectory": true,
  "starters.createNextApp.needsAppRouter": true,
  "starters.createNextApp.customizeTheDefaultImportAlias": "@/*",

  "starters.createSvelte.whichAppTemplate": "default",
  "starters.createSvelte.addTypeCheckingWith": "typescript",
  "starters.createSvelte.needsEslint": true,
  "starters.createSvelte.needsPrettier": true,
  "starters.createSvelte.needsPlaywright": true,
  "starters.createSvelte.needsVitest": true,
  "starters.createSvelte.trySvelte5Preview": true,

  "starters.createSolid.whichTemplate": "bare",
  "starters.createSolid.needsSsr": true,
  "starters.createSolid.needsTypeScript": true,

  "starters.createNest.needsTypeScript": true,

  "starters.createExpoApp.whichTemplate": "expo-template-blank-typescript"
}
```

## Support Templates

- [Nuxt3 Minimal Starter](https://github.com/nuxt/starter/tree/v3) - Create a new Nuxt project.
- [Vitesse Nuxt3](https://github.com/antfu/vitesse-nuxt3) - Vitesse for Nuxt 3.
- [Create Vue](https://github.com/vuejs/create-vue) - The recommended way to start a Vite-powered Vue project.
- [Vitesse](https://github.com/antfu/vitesse) - Opinionated starter template.
- [Vitesse Lite](https://github.com/antfu/vitesse-lite) - Lightweight version of Vitesse.
- [Create Next App](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) - The easiest way to get started with Next.js.
- [Create Svelte](https://github.com/sveltejs/kit/tree/main/packages/create-svelte) - Create new SvelteKit projects.
- [Create Solid](https://github.com/solidjs/solid-start/tree/main/packages/create-solid) - The easiest way to get started with Solid.
- [Starter TS](https://github.com/antfu/starter-ts) - Starter template for TypeScript library.
- [Starter VSCode](https://github.com/antfu/starter-vscode) - Starter template for VS Code Extension.
- [Vitesse WebExt](https://github.com/antfu/vitesse-webext) - WebExtension Vite Starter Template.
- [Nest CLI](https://github.com/nestjs/nest-cli) - CLI tool for Nest applications.
- [Create Expo App](https://github.com/expo/expo/tree/main/packages/create-expo) - The fastest way to create universal React apps.
- ...

## License

MIT License © 2023 [YRM](https://github.com/yrming)

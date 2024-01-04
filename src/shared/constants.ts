export const fiveMinutesInMs = 1000 * 60 * 5

export const isWin = process.platform.startsWith('win')
export const projectSearchProgressText = 'Searching for projects...'
export const projectSearchProgressNotificationDelayInMs = 2000
export const projectSearchCacheTimeInMs = fiveMinutesInMs
export const STARTER_TEMPLATE_CREATE_PROJECT_TRIGGER_FILE = 'starters.create'
export const gitIgnoreForCreateSolid = `
dist
.solid
.output
.vercel
.netlify
.vinxi
.nitro
netlify

# Environment
.env
.env*.local

# dependencies
/node_modules

# IDEs and editors
/.idea
.project
.classpath
*.launch
.settings/

# Temp
gitignore

# System Files
.DS_Store
Thumbs.db
`

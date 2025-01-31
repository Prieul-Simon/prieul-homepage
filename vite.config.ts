import { defineConfig, Plugin } from 'vite'
import mdPlugin, { Mode } from 'vite-plugin-markdown'

const linkTargetBlankPatch = (): Plugin => ({
    name: 'link-target-blank-patch',
    enforce: 'pre',
    transform(code) {
        return code.replaceAll('<a href=', '<a target=\\"_blank\\" href=')
    },
})

export default defineConfig({
    plugins: [
        mdPlugin({
            mode: [Mode.HTML],
        }),
        linkTargetBlankPatch(),
    ],
})
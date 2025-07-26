import { defineConfig, Plugin } from 'vite'
import mdPlugin, { Mode } from 'vite-plugin-markdown'
import frontMatter from 'front-matter'
import markdownIt from 'markdown-it'

const mdInjectProdPlugin = (): Plugin => {
    // From implementation in ./node_modules/vite-plugin-markdown/dist/index.js
    function toHtml(markdownContent: string): string {
        const fm = frontMatter(markdownContent)
        const markdownCompiler = markdownIt({
            html: true,
            xhtmlOut: false,
        })
        const html = markdownCompiler.render(fm.body);
        return html
    }

    return {
        name: 'markdown-inject-prod-plugin',
        enforce: 'pre',
        apply: 'build',
        async transformIndexHtml(html, ctx) {
            const markdownFile = ctx.filename.endsWith('fr.html') ? Bun.file('./src/fr.md') : Bun.file('./src/en.md')
            const markdownContent = await markdownFile.text()
            const out = toHtml(markdownContent)
            return html.replace('<!-- MARKDOWN -->', out);
        }
    }
}

const mdDevPlugin = (): Plugin => ({
    ...mdPlugin({
        mode: [Mode.HTML],
    }),
    apply: 'serve',
})

const injectScriptDevPlugin = (): Plugin => ({
    name: 'inject-script-dev-plugin',
    apply: 'serve',
    transformIndexHtml(html) {
        return html
            .replace('<!-- APP-DEV-EN -->', `
    <main id="app-dev" class="main-content"></main>
    <script id="dev-script" type="module">
        import { html } from './src/en.md'
        document.getElementById('app-dev').innerHTML = html
    </script>`)
            .replace('<!-- APP-DEV-FR -->', `
    <main id="app-dev" class="main-content"></main>
    <script id="dev-script" type="module">
        import { html } from './src/fr.md'
        document.getElementById('app-dev').innerHTML = html
    </script>`)
    },
})

const injectScriptProdPlugin = (): Plugin => ({
    name: 'inject-script-prod-plugin',
    apply: 'build',
    transformIndexHtml(html) {
        return html
            // No script injection, just remove HTML comments
            .replace('<!-- APP-DEV-EN -->', '')
            .replace('<!-- APP-DEV-FR -->', '')
    },
})

const linkTargetBlankPatchDevPlugin = (): Plugin => ({
    name: 'link-target-blank-patch-dev-plugin',
    apply: 'serve',
    enforce: 'post',
    transform(code, id) {
        if (id.endsWith('.md')) {
            return code.replaceAll('<a href=', '<a target=\\"_blank\\" href=')
        }
        return code
    },
})

const linkTargetBlankPatchProdPlugin = (): Plugin => ({
    name: 'link-target-blank-patch-prod-plugin',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
        return html.replaceAll('<a href=', '<a target="_blank" href=')
    },
})

export default defineConfig({
    appType: "mpa",
    build: {
        rollupOptions: {
            input: {
                index: './index.html',
                fr: './fr.html',
            }
        }
    },
    plugins: [
        mdInjectProdPlugin(),
        mdDevPlugin(),
        injectScriptDevPlugin(),
        injectScriptProdPlugin(),
        linkTargetBlankPatchDevPlugin(),
        linkTargetBlankPatchProdPlugin(),
    ],
})
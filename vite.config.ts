import { defineConfig, Plugin } from 'vite'
import mdPlugin, { Mode } from 'vite-plugin-markdown'
import frontMatter from 'front-matter'
import markdownIt from 'markdown-it'
import { createHead, transformHtmlTemplate } from 'unhead/server'

type ResolvableHeads = NonNullable<NonNullable<Parameters<typeof createHead>[0]>['init']>
const HTML_COMMON_HEAD: ResolvableHeads = [
    {
        titleTemplate: 'Simon Prieul | %s',
        link: [
            {
                rel: 'icon',
                type: 'image/svg+xml',
                href: '/favicon.svg',
                sizes: 'any',
            },
            {
                rel: 'stylesheet',
                href: 'https://fonts.googleapis.com/css?family=Inter:300,700',
            },
            {
                rel: 'stylesheet',
                href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css',
                integrity: "sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==",
                crossorigin: "anonymous",
                referrerpolicy: "no-referrer",
            },
        ],
        meta: [
            {
                name: 'application-name',
                content: 'Simon Prieul',
            },
            {
                name: 'author',
                content: 'Simon Prieul',
            },
            {
                name: 'keywords',
                content: 'simon, prieul, web, developer, fullstack, software, engineer, javascript, typescript, code'
            }
        ]
    }
]

const titleAndDesc = [
    'Software Engineer',
    'Simon Prieul, senior french software engineer and fullstack web developer.',
    'Ingénieur Logiciel',
    'Simon Prieul, ingénieur logiciel senior français et développeur web fullstack.',
]
const HTML_HEADS: Record<string, ResolvableHeads> = {
    'index.html': [
        {
            htmlAttrs: { lang: 'en', translate: 'no' },
            title: titleAndDesc[0],
            meta: [
                {
                    name: 'description',
                    content: titleAndDesc[1],
                },
                {
                    property: 'og:title',
                    content: titleAndDesc[0],
                },
                {
                    property: 'og:description',
                    content: titleAndDesc[1],
                },
            ],
            link: [
                {
                    rel: 'canonical',
                    href: 'https://simon.prieul.fr',
                }
            ],
        }
    ],
    'fr.html': [
        {
            htmlAttrs: { lang: 'fr', translate: 'no' },
            title: titleAndDesc[2],
            meta: [
                {
                    name: 'description',
                    content: titleAndDesc[3],
                },
                {
                    property: 'og:title',
                    content: titleAndDesc[2],
                },
                {
                    property: 'og:description',
                    content: titleAndDesc[3],
                },
            ],
            link: [
                {
                    rel: 'canonical',
                    href: 'https://simon.prieul.fr/fr',
                }
            ],
        }
    ],
}

const unheadPlugin = (): Plugin => {
    return {
        name: 'unhead-plugin',
        async transformIndexHtml(html, ctx) {
            const filename = ctx.filename.split('/').pop() ?? 'index.html'
            const init = [...HTML_COMMON_HEAD, ...HTML_HEADS[filename]]
            return await transformHtmlTemplate(createHead({ init }), html)
        },
    }
}

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
        unheadPlugin(),
        mdInjectProdPlugin(),
        mdDevPlugin(),
        injectScriptDevPlugin(),
        injectScriptProdPlugin(),
        linkTargetBlankPatchDevPlugin(),
        linkTargetBlankPatchProdPlugin(),
    ],
})
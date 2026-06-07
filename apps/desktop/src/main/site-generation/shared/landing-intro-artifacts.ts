import landingIntroLibSource from '@emprint/shared/cross/landing-intro.ts?raw'
import type { WorkspaceArtifact } from '@emprint/core'
import landingIntroCssTemplate from './landing-intro.css?raw'

function landingIntroCss(classPrefix: string): string {
  return landingIntroCssTemplate.replaceAll('__PREFIX__', classPrefix)
}

function landingIntroComponentAstro(classPrefix: string): string {
  return `---
import themeFile from '../../config/theme.json'
import { resolveLandingIntroFromTheme } from '../lib/landing-intro'

const classPrefix = themeFile.classPrefix ?? '${classPrefix}'
const intro = resolveLandingIntroFromTheme(themeFile as Record<string, unknown>)
---

{intro.enabled ? (
  <>
    <script is:inline define:vars={{ classPrefix, introShowOnce: intro.showOnce }}>
      (function () {
        function navType() {
          try {
            var nav = performance.getEntriesByType('navigation')[0]
            return nav && nav.type ? nav.type : 'navigate'
          } catch (e) {
            return 'navigate'
          }
        }
        function shouldSkip() {
          var persistKey = classPrefix + '-landing-intro-seen'
          var sessionKey = classPrefix + '-landing-intro-session'
          var isReload = navType() === 'reload'
          if (introShowOnce) {
            try {
              if (localStorage.getItem(persistKey) === '1') return true
            } catch (e) {}
          }
          if (!isReload) {
            try {
              if (sessionStorage.getItem(sessionKey) === '1') return true
            } catch (e) {}
          }
          return false
        }
        if (shouldSkip()) {
          document.documentElement.classList.add(classPrefix + '-intro-skip')
        }
      })()
    </script>
    {intro.variant === 'script' ? (
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&display=swap"
      />
    ) : null}
    <div
      class={\`\${classPrefix}-LandingIntro\`}
      data-pagefind-ignore
      data-variant={intro.variant}
      data-show-once={intro.showOnce ? 'true' : 'false'}
      data-typing-delay={intro.typingDelayMs}
      data-pause-ms={intro.pauseBeforeFadeMs}
      data-fade-ms={intro.fadeDurationMs}
      aria-live="polite"
      role="presentation"
    >
      <div class={\`\${classPrefix}-LandingIntro-inner\`}>
        <p class={\`\${classPrefix}-LandingIntro-text\`}></p>
        {intro.variant === 'terminal' ? (
          <span class={\`\${classPrefix}-LandingIntro-cursor\`} aria-hidden="true" />
        ) : null}
      </div>
    </div>
    <script
      is:inline
      define:vars={{
        classPrefix,
        introVariant: intro.variant,
        introMessage: intro.message,
        introTypingDelay: intro.typingDelayMs,
        introPauseMs: intro.pauseBeforeFadeMs,
        introFadeMs: intro.fadeDurationMs,
        introShowOnce: intro.showOnce
      }}
    >
      (function () {
        var persistKey = classPrefix + '-landing-intro-seen'
        var sessionKey = classPrefix + '-landing-intro-session'

        function navType() {
          try {
            var nav = performance.getEntriesByType('navigation')[0]
            return nav && nav.type ? nav.type : 'navigate'
          } catch (e) {
            return 'navigate'
          }
        }

        function shouldSkipIntro() {
          var isReload = navType() === 'reload'
          if (introShowOnce) {
            try {
              if (localStorage.getItem(persistKey) === '1') return true
            } catch (e) {}
          }
          if (!isReload) {
            try {
              if (sessionStorage.getItem(sessionKey) === '1') return true
            } catch (e) {}
          }
          return false
        }

        function markIntroSeen() {
          try {
            sessionStorage.setItem(sessionKey, '1')
          } catch (e) {}
          if (introShowOnce) {
            try {
              localStorage.setItem(persistKey, '1')
            } catch (e) {}
          }
        }

        function dismissOverlay(overlay) {
          if (!overlay) return
          overlay.classList.add(classPrefix + '-LandingIntro--done')
          document.documentElement.classList.remove(classPrefix + '-intro-active')
        }

        function run() {
          var overlay = document.querySelector('.' + classPrefix + '-LandingIntro')
          if (!overlay) return

          if (shouldSkipIntro()) {
            dismissOverlay(overlay)
            return
          }

          var textEl = overlay.querySelector('.' + classPrefix + '-LandingIntro-text')
          var cursor = overlay.querySelector('.' + classPrefix + '-LandingIntro-cursor')
          if (!textEl) {
            dismissOverlay(overlay)
            return
          }

          var message = introMessage || 'Your content belongs to you.'
          var typingDelay = introTypingDelay || 52
          var pauseMs = introPauseMs || 900
          var fadeMs = introFadeMs || 750
          var variant = introVariant === 'script' ? 'script' : 'terminal'
          var index = 0
          var finished = false

          document.documentElement.style.setProperty('--' + classPrefix + '-intro-fade-ms', fadeMs + 'ms')
          document.documentElement.classList.add(classPrefix + '-intro-active')

          function finish() {
            if (finished) return
            finished = true
            overlay.classList.add(classPrefix + '-LandingIntro--fade')
            window.setTimeout(function () {
              dismissOverlay(overlay)
              markIntroSeen()
            }, fadeMs)
          }

          var failsafe = window.setTimeout(finish, Math.max(8000, message.length * typingDelay + pauseMs + fadeMs + 500))

          function typeNext() {
            if (finished) return
            if (index >= message.length) {
              if (cursor) cursor.style.display = 'none'
              window.clearTimeout(failsafe)
              window.setTimeout(finish, pauseMs)
              return
            }
            var ch = message.charAt(index++)
            if (variant === 'script') {
              var span = document.createElement('span')
              span.className = classPrefix + '-LandingIntro-char'
              span.textContent = ch === ' ' ? '\\u00a0' : ch
              textEl.appendChild(span)
            } else {
              textEl.textContent += ch
            }
            window.setTimeout(typeNext, typingDelay)
          }

          typeNext()
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', run, { once: true })
        } else {
          run()
        }
      })()
    </script>
  </>
) : null}
`.replaceAll('<div ', '<div ').replaceAll('</div>', '</div>')
}

/** Landing intro components + styles for any anthology class prefix. */
export function createLandingIntroArtifacts(classPrefix: string): WorkspaceArtifact[] {
  return [
    {
      relativePath: 'src/lib/landing-intro.ts',
      content: landingIntroLibSource
    },
    {
      relativePath: 'src/styles/landing-intro.css',
      content: landingIntroCss(classPrefix)
    },
    {
      relativePath: 'src/components/LandingIntro.astro',
      content: landingIntroComponentAstro(classPrefix)
    }
  ]
}

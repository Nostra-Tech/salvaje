/**
 * Global site footer — shown on every page across the hosting.
 * "Nostra Tech" links to the company site.
 */
export function Footer({ className = '' }) {
  return (
    <footer className={`w-full border-t border-salvaje-cream bg-salvaje-light px-4 py-4 text-center ${className}`}>
      <p className="font-body text-xs text-salvaje-gray">
        Copyright © 2026 Powered by{' '}
        <a
          href="https://nostratech.com.co/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-salvaje-orange hover:text-salvaje-fire hover:underline transition-colors"
        >
          Nostra Tech
        </a>
        . Todos los derechos reservados.
      </p>
    </footer>
  )
}

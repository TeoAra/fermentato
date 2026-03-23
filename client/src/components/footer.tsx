import { Facebook, Instagram } from "lucide-react";
import { Link } from "wouter";
import { CookieSettingsButton } from "@/components/CookieBanner";

export default function Footer() {
  return (
    <footer className="bg-[hsl(38,14%,94%)] dark:bg-[hsl(25,14%,9%)] text-[hsl(28,12%,36%)] dark:text-[hsl(35,8%,58%)] border-t border-[hsl(36,14%,87%)] dark:border-[hsl(25,12%,15%)] mt-16 pb-16 lg:pb-0 -mb-16 lg:mb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <img src="/logo-full.png" alt="Fermenta.to" className="h-10 w-auto block dark:hidden" />
              <img src="/logo-dark-mode.png" alt="Fermenta.to" className="h-10 w-auto hidden dark:block" />
            </div>
            <p className="text-[hsl(28,8%,48%)] dark:text-[hsl(35,8%,52%)] mb-4 text-sm leading-relaxed">
              La piattaforma definitiva per scoprire le migliori birre artigianali nei pub e birrifici d'Italia.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/fermentato.social" target="_blank" rel="noopener noreferrer" className="text-neutral-500 dark:text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                <Facebook size={24} />
              </a>
              <a href="https://www.instagram.com/fermentato.social" target="_blank" rel="noopener noreferrer" className="text-neutral-500 dark:text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                <Instagram size={24} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-neutral-900 dark:text-white">Per i Locali</h3>
            <ul className="space-y-2 text-neutral-500 dark:text-neutral-400">
              <li>
                <Link href="/dashboard" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                  Dashboard Gestione
                </Link>
              </li>
              <li>
                <Link href="/prezzi" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Prezzi e Piani</Link>
              </li>
              <li>
                <Link href="/supporto" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Supporto</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-neutral-900 dark:text-white">Informazioni</h3>
            <ul className="space-y-2 text-neutral-500 dark:text-neutral-400">
              <li>
                <Link href="/chi-siamo" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Chi Siamo</Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/tos" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Termini di Servizio</Link>
              </li>
              <li>
                <Link href="/contatti" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Contatti</Link>
              </li>
              <li>
                <CookieSettingsButton />
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[hsl(36,14%,87%)] dark:border-[hsl(25,12%,16%)] mt-8 pt-8 text-center text-[hsl(28,8%,56%)] dark:text-[hsl(35,8%,44%)] text-sm">
          <p>&copy; 2024 Fermenta.to. Tutti i diritti riservati.</p>
        </div>
      </div>
    </footer>
  );
}

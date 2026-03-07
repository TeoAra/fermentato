import { Beer, Facebook, Instagram } from "lucide-react";
import { Link } from "wouter";
import { CookieSettingsButton } from "@/components/CookieBanner";

export default function Footer() {
  return (
    <footer className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 mt-16 pb-16 lg:pb-0 -mb-16 lg:mb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <Beer className="text-amber-500 text-2xl mr-2" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">Fermenta.to</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              La piattaforma definitiva per scoprire le migliori birre artigianali nei pub e birrifici d'Italia.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/fermentato.social" target="_blank" rel="noopener noreferrer" className="text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                <Facebook size={24} />
              </a>
              <a href="https://www.instagram.com/fermentato.social" target="_blank" rel="noopener noreferrer" className="text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                <Instagram size={24} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-slate-900 dark:text-white">Per i Locali</h3>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400">
              <li>
                <Link href="/register-pub" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                  Registra il tuo Pub
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                  Dashboard Gestione
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Prezzi e Piani</a>
              </li>
              <li>
                <a href="#" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Supporto</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-slate-900 dark:text-white">Informazioni</h3>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400">
              <li>
                <a href="#" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Chi Siamo</a>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/tos" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Termini di Servizio</Link>
              </li>
              <li>
                <a href="#" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">Contatti</a>
              </li>
              <li>
                <CookieSettingsButton />
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 mt-8 pt-8 text-center text-slate-400 dark:text-slate-500">
          <p>&copy; 2024 Fermenta.to. Tutti i diritti riservati.</p>
        </div>
      </div>
    </footer>
  );
}

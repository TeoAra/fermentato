import { Beer, Facebook, Instagram, Twitter } from "lucide-react";
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-secondary text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <Beer className="text-primary text-2xl mr-2" />
              <span className="text-2xl font-bold">Fermenta.to</span>
            </div>
            <p className="text-gray-300 mb-4">
              La piattaforma definitiva per scoprire le migliori birre artigianali nei pub e birrifici d'Italia.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-primary">
                <Facebook size={24} />
              </a>
              <a href="#" className="text-gray-300 hover:text-primary">
                <Instagram size={24} />
              </a>
              <a href="#" className="text-gray-300 hover:text-primary">
                <Twitter size={24} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Per i Locali</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href="/register-pub" className="hover:text-primary">
                  Registra il tuo Pub
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-primary">
                  Dashboard Gestione
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-primary">Prezzi e Piani</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">Supporto</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Informazioni</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="#" className="hover:text-primary">Chi Siamo</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">Privacy Policy</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">Termini di Servizio</a>
              </li>
              <li>
                <a href="#" className="hover:text-primary">Contatti</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Fermenta.to. Tutti i diritti riservati.</p>
        </div>
      </div>
    </footer>
  );
}

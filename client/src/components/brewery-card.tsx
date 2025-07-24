import { Star, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

interface BreweryCardProps {
  brewery: {
    id: number;
    name: string | any;
    location: string | any;
    region: string | any;
    rating: string | number | null;
    logoUrl?: string | null;
  };
  beerCount?: number;
}

export default function BreweryCard({ brewery, beerCount = 0 }: BreweryCardProps) {
  return (
    <Link href={`/brewery/${brewery.id}`}>
      <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <img
            src={brewery.logoUrl || "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120"}
            alt={`Logo ${brewery.name}`}
            className="w-20 h-20 mx-auto rounded-full object-cover mb-4"
          />
          
          <h3 className="font-semibold text-lg text-secondary mb-2 hover:text-primary transition-colors">
            {typeof brewery.name === 'string' ? brewery.name : brewery.name?.toString() || 'Birrificio'}
          </h3>
          
          <p className="text-gray-600 text-sm mb-2 flex items-center justify-center">
            <MapPin className="w-4 h-4 mr-1" />
            {typeof brewery.location === 'string' ? brewery.location : brewery.location?.name || 'Località'}, {typeof brewery.region === 'string' ? brewery.region : brewery.region?.name || 'Regione'}
          </p>
          
          <div className="text-sm text-gray-500 mb-3">
            {beerCount} birre disponibili
          </div>
          
          <div className="flex items-center justify-center">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-600">{typeof brewery.rating === 'string' || typeof brewery.rating === 'number' ? brewery.rating : "N/A"}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

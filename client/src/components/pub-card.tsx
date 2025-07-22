import { Star, Beer, Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface PubCardProps {
  pub: {
    id: number;
    name: string;
    address: string;
    city: string;
    rating: string | null;
    coverImageUrl?: string | null;
    logoUrl?: string | null;
    isActive: boolean;
  };
}

export default function PubCard({ pub }: PubCardProps) {
  // Fetch real tap list count
  const { data: tapList } = useQuery({
    queryKey: ["/api/pubs", pub.id, "taplist"],
  });

  const beersOnTap = Array.isArray(tapList) ? tapList.filter(item => item.isActive).length : 0;

  return (
    <Link href={`/pub/${pub.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="relative">
          <img
            src={pub.coverImageUrl || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=240"}
            alt={`${pub.name} - Copertina`}
            className="w-full h-48 object-cover"
          />
          {!pub.isActive && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-semibold">Temporaneamente Chiuso</span>
            </div>
          )}
        </div>
        
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold text-secondary truncate">{pub.name}</h3>
            <div className="flex items-center">
              <Star className="text-yellow-400 w-4 h-4" />
              <span className="ml-1 text-gray-600">{pub.rating || "N/A"}</span>
            </div>
          </div>
          
          <p className="text-gray-600 mb-3 flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {pub.address}, {pub.city}
          </p>
          
          <div className="flex items-center justify-between text-sm">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Beer className="w-3 h-3 mr-1" />
              {beersOnTap} spine attive
            </Badge>
            <span className={`flex items-center ${pub.isActive ? 'text-green-600' : 'text-red-600'}`}>
              <Clock className="w-4 h-4 mr-1" />
              {pub.isActive ? 'Attivo' : 'Non attivo'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

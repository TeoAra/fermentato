import { ArrowLeft, BeerIcon, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminContentManager from "@/components/AdminContentManager";
import { Link } from "wouter";

export default function AdminContent() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard Admin
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestione Contenuti
          </h1>
        </div>

        <Tabs defaultValue="beers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="beers" className="flex items-center gap-2 text-sm font-semibold data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <BeerIcon className="w-4 h-4" />
              Birre
            </TabsTrigger>
            <TabsTrigger value="breweries" className="flex items-center gap-2 text-sm font-semibold data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Building2 className="w-4 h-4" />
              Birrifici
            </TabsTrigger>
            <TabsTrigger value="pubs" className="flex items-center gap-2 text-sm font-semibold data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <MapPin className="w-4 h-4" />
              Pub
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beers">
            <AdminContentManager type="beers" />
          </TabsContent>

          <TabsContent value="breweries">
            <AdminContentManager type="breweries" />
          </TabsContent>

          <TabsContent value="pubs">
            <AdminContentManager type="pubs" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

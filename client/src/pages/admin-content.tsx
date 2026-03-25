import { ArrowLeft, BeerIcon, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminContentManager from "@/components/AdminContentManager";
import { Link } from "wouter";

export default function AdminContent() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="border-stone-200 hover:bg-stone-50 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard Admin
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">
            Gestione Contenuti
          </h1>
        </div>

        <Tabs defaultValue="beers" className="space-y-6">
          <TabsList className="bg-stone-50 dark:bg-[hsl(25,14%,12%)] p-1 rounded-2xl h-auto">
            <TabsTrigger value="beers" className="flex items-center gap-2 text-sm font-semibold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(25,14%,10%)] data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <BeerIcon className="w-4 h-4" />
              Birre
            </TabsTrigger>
            <TabsTrigger value="breweries" className="flex items-center gap-2 text-sm font-semibold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(25,14%,10%)] data-[state=active]:text-primary data-[state=active]:shadow-sm">
              <Building2 className="w-4 h-4" />
              Birrifici
            </TabsTrigger>
            <TabsTrigger value="pubs" className="flex items-center gap-2 text-sm font-semibold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-[hsl(25,14%,10%)] data-[state=active]:text-primary data-[state=active]:shadow-sm">
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

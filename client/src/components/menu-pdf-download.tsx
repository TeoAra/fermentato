import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface MenuPdfDownloadProps {
  pubName: string;
  tapList?: any[];
  bottleList?: any[];
  menuCategories?: any[];
  compact?: boolean;
}

export function MenuPdfDownload({ pubName, tapList = [], bottleList = [], menuCategories = [], compact }: MenuPdfDownloadProps) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;

      const checkPageBreak = (needed: number) => {
        if (y + needed > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 20;
        }
      };

      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(pubName, pageWidth / 2, y, { align: "center" });
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text("fermenta.to", pageWidth / 2, y, { align: "center" });
      doc.setTextColor(0, 0, 0);
      y += 6;

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      const activeTaps = tapList.filter((t: any) => t.isActive !== false);
      if (activeTaps.length > 0) {
        checkPageBreak(15);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 100, 0);
        doc.text("ALLA SPINA", margin, y);
        doc.setTextColor(0, 0, 0);
        y += 8;

        for (const tap of activeTaps) {
          checkPageBreak(18);
          const beerName = tap.beer?.name || tap.beerName || "Birra";
          const brewery = tap.beer?.brewery?.name || tap.beer?.breweryName || "";
          const style = tap.beer?.style || "";
          const abv = tap.beer?.abv ? `${tap.beer.abv}%` : "";

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(beerName, margin, y);

          const priceText = formatPrices(tap.prices || []);
          if (priceText) {
            doc.setFont("helvetica", "normal");
            doc.text(priceText, pageWidth - margin, y, { align: "right" });
          }
          y += 5;

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          const details = [brewery, style, abv].filter(Boolean).join(" • ");
          doc.text(details, margin, y);
          doc.setTextColor(0, 0, 0);
          y += 7;
        }
        y += 5;
      }

      if (bottleList.length > 0) {
        checkPageBreak(15);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 50, 150);
        doc.text("CANTINA", margin, y);
        doc.setTextColor(0, 0, 0);
        y += 8;

        for (const bottle of bottleList) {
          checkPageBreak(18);
          const beerName = bottle.beer?.name || "Birra";
          const brewery = bottle.beer?.brewery?.name || "";
          const style = bottle.beer?.style || "";
          const abv = bottle.beer?.abv ? `${bottle.beer.abv}%` : "";

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(beerName, margin, y);

          const priceText = formatPrices(bottle.prices || []);
          if (priceText) {
            doc.setFont("helvetica", "normal");
            doc.text(priceText, pageWidth - margin, y, { align: "right" });
          }
          y += 5;

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          const details = [brewery, style, abv].filter(Boolean).join(" • ");
          doc.text(details, margin, y);
          doc.setTextColor(0, 0, 0);
          y += 7;
        }
        y += 5;
      }

      const visibleCategories = menuCategories.filter((c: any) => c.isVisible !== false);
      for (const category of visibleCategories) {
        checkPageBreak(15);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 100, 150);
        doc.text(category.name.toUpperCase(), margin, y);
        doc.setTextColor(0, 0, 0);
        y += 8;

        const visibleItems = (category.items || []).filter((i: any) => i.isVisible !== false);
        for (const item of visibleItems) {
          checkPageBreak(18);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(item.name, margin, y);

          if (item.price) {
            doc.setFont("helvetica", "normal");
            doc.text(`€${parseFloat(item.price).toFixed(2)}`, pageWidth - margin, y, { align: "right" });
          }
          y += 5;

          if (item.description) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(100, 100, 100);
            const lines = doc.splitTextToSize(item.description, pageWidth - margin * 2 - 20);
            for (const line of lines.slice(0, 2)) {
              checkPageBreak(5);
              doc.text(line, margin, y);
              y += 4;
            }
            doc.setTextColor(0, 0, 0);
          }
          y += 3;
        }
        y += 5;
      }

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      const footer = `Generato da Fermenta.to - ${new Date().toLocaleDateString("it-IT")}`;
      doc.text(footer, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });

      doc.save(`menu-${pubName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
      toast({ title: "PDF scaricato!", description: "Il menu è stato salvato come PDF" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Errore", description: "Impossibile generare il PDF", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return compact ? (
    <Button variant="outline" size="sm" onClick={generatePdf} disabled={generating} className="gap-2">
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      PDF
    </Button>
  ) : (
    <Button variant="outline" onClick={generatePdf} disabled={generating} className="gap-2 w-full">
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      Scarica Menu PDF
    </Button>
  );
}

function formatPrices(prices: any[]): string {
  if (!prices || prices.length === 0) return "";
  return prices.map((p: any) => {
    const size = p.size || p.format || "";
    const price = p.price ? `€${parseFloat(p.price).toFixed(2)}` : "";
    return size ? `${size} ${price}` : price;
  }).filter(Boolean).join(" | ");
}

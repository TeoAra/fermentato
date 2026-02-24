import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";

interface MenuPdfDownloadProps {
  pubName: string;
  tapList?: any[];
  bottleList?: any[];
  menuCategories?: any[];
  menuInfoBox?: string | null;
  compact?: boolean;
}

const AMBER = [180, 100, 0] as const;
const PURPLE = [100, 50, 150] as const;
const TEAL = [0, 128, 128] as const;
const GRAY = [100, 100, 100] as const;
const LIGHT_GRAY = [150, 150, 150] as const;
const BLACK = [0, 0, 0] as const;
const INFO_BG = [245, 245, 220] as const;
const INFO_BORDER = [200, 180, 100] as const;

export function MenuPdfDownload({ pubName, tapList = [], bottleList = [], menuCategories = [], menuInfoBox, compact }: MenuPdfDownloadProps) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const { data: allergensData } = useQuery<any[]>({
    queryKey: ["/api/allergens"],
  });

  const allergensMap = new Map<number, { name: string; emoji: string }>();
  if (allergensData) {
    for (const a of allergensData) {
      allergensMap.set(a.id, { name: a.name, emoji: a.emoji || "" });
    }
  }

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const checkPageBreak = (needed: number) => {
        if (y + needed > pageHeight - 20) {
          addFooter(doc, pageWidth, pageHeight);
          doc.addPage();
          y = 15;
        }
      };

      doc.setFontSize(26);
      doc.setFont("helvetica", "bold");
      doc.text(pubName, pageWidth / 2, y, { align: "center" });
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...LIGHT_GRAY);
      doc.text("fermenta.to", pageWidth / 2, y, { align: "center" });
      doc.setTextColor(...BLACK);
      y += 4;

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      const activeTaps = tapList.filter((t: any) => t.isActive !== false);
      if (activeTaps.length > 0) {
        y = renderSectionHeader(doc, "ALLA SPINA", AMBER, margin, y, checkPageBreak);
        y = renderBeerSubtitle(doc, `${activeTaps.length} birre disponibili`, margin, y);

        for (const tap of activeTaps) {
          y = renderBeerItem(doc, tap, margin, contentWidth, pageWidth, y, checkPageBreak);
        }
        y += 3;
      }

      if (bottleList.length > 0) {
        y = renderSectionHeader(doc, "BOTTIGLIE & LATTINE", PURPLE, margin, y, checkPageBreak);
        y = renderBeerSubtitle(doc, `${bottleList.length} referenze`, margin, y);

        for (const bottle of bottleList) {
          y = renderBeerItem(doc, bottle, margin, contentWidth, pageWidth, y, checkPageBreak);
        }
        y += 3;
      }

      const visibleCategories = menuCategories.filter((c: any) => c.isVisible !== false);
      if (visibleCategories.length > 0 || menuInfoBox) {
        checkPageBreak(15);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        if (menuInfoBox) {
          y = renderInfoBox(doc, menuInfoBox, margin, contentWidth, y, checkPageBreak);
        }

        for (const category of visibleCategories) {
          y = renderFoodCategory(doc, category, margin, contentWidth, pageWidth, y, checkPageBreak, allergensMap);
        }
      }

      addFooter(doc, pageWidth, pageHeight);
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

function addFooter(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150, 150, 150);
  const footer = `Generato da Fermenta.to - ${new Date().toLocaleDateString("it-IT")}`;
  doc.text(footer, pageWidth / 2, pageHeight - 10, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

function renderSectionHeader(
  doc: jsPDF,
  title: string,
  color: readonly [number, number, number],
  margin: number,
  y: number,
  checkPageBreak: (n: number) => void
): number {
  checkPageBreak(15);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...color);
  doc.text(title, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 5;
  return y;
}

function renderBeerSubtitle(doc: jsPDF, text: string, margin: number, y: number): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...GRAY);
  doc.text(text, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 6;
  return y;
}

function renderBeerItem(
  doc: jsPDF,
  item: any,
  margin: number,
  contentWidth: number,
  pageWidth: number,
  y: number,
  checkPageBreak: (n: number) => void
): number {
  const description = item.description || item.beer?.description || "";
  const neededHeight = 14 + (description ? 8 : 0);
  checkPageBreak(neededHeight);

  const beerName = item.beer?.name || item.beerName || "Birra";
  const brewery = item.beer?.brewery?.name || item.beer?.breweryName || "";
  const style = item.beer?.style || "";
  const abv = item.beer?.abv ? `${item.beer.abv}%` : "";

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(beerName, margin, y);

  const priceText = formatPrices(item.prices || []);
  if (priceText) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(priceText, pageWidth - margin, y, { align: "right" });
  }
  y += 4.5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  const badges: string[] = [];
  if (item.beer?.isGlutenFree) badges.push("Senza Glutine");
  if (item.beer?.isAlcoholFree) badges.push("0.0%");
  const detailParts = [brewery, style, abv, ...badges].filter(Boolean);
  const details = detailParts.join(" \u2022 ");
  if (details) {
    doc.text(details, margin, y);
    y += 4;
  }

  if (description) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    const lines = doc.splitTextToSize(description, contentWidth - 5);
    for (const line of lines.slice(0, 3)) {
      checkPageBreak(4);
      doc.text(line, margin + 2, y);
      y += 3.5;
    }
  }

  doc.setTextColor(0, 0, 0);
  y += 3;
  return y;
}

function renderInfoBox(
  doc: jsPDF,
  text: string,
  margin: number,
  contentWidth: number,
  y: number,
  checkPageBreak: (n: number) => void
): number {
  const lines = doc.splitTextToSize(text, contentWidth - 12);
  const boxHeight = lines.length * 4.5 + 6;
  checkPageBreak(boxHeight + 4);

  doc.setFillColor(...INFO_BG);
  doc.setDrawColor(...INFO_BORDER);
  doc.roundedRect(margin, y - 1, contentWidth, boxHeight, 2, 2, "FD");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 80, 30);
  let textY = y + 4;
  for (const line of lines) {
    doc.text(line, margin + 6, textY);
    textY += 4.5;
  }

  doc.setTextColor(0, 0, 0);
  return y + boxHeight + 4;
}

function renderFoodCategory(
  doc: jsPDF,
  category: any,
  margin: number,
  contentWidth: number,
  pageWidth: number,
  y: number,
  checkPageBreak: (n: number) => void,
  allergensMap: Map<number, { name: string; emoji: string }>
): number {
  checkPageBreak(15);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEAL);
  doc.text(category.name.toUpperCase(), margin, y);
  doc.setTextColor(0, 0, 0);
  y += 1;

  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 30, y);
  doc.setLineWidth(0.2);
  y += 4;

  if (category.description) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRAY);
    const descLines = doc.splitTextToSize(category.description, contentWidth);
    for (const line of descLines.slice(0, 3)) {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += 4;
    }
    doc.setTextColor(0, 0, 0);
    y += 2;
  }

  if (category.infoBox) {
    y = renderInfoBox(doc, category.infoBox, margin, contentWidth, y, checkPageBreak);
  }

  const visibleItems = (category.items || []).filter((i: any) => i.isVisible !== false);
  for (const item of visibleItems) {
    if (item.isInfoBox) {
      const infoText = item.description || item.name;
      if (infoText) {
        y = renderInfoBox(doc, infoText, margin, contentWidth, y, checkPageBreak);
      }
      continue;
    }
    const hasDescription = !!item.description;
    const hasAllergens = item.allergens && Array.isArray(item.allergens) && item.allergens.length > 0;
    const neededHeight = 8 + (hasDescription ? 8 : 0) + (hasAllergens ? 5 : 0);
    checkPageBreak(neededHeight);

    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.text(item.name, margin, y);

    if (item.price) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const priceStr = `\u20AC${parseFloat(item.price).toFixed(2)}`;
      doc.text(priceStr, pageWidth - margin, y, { align: "right" });
    }
    y += 4.5;

    if (hasDescription) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(110, 110, 110);
      const lines = doc.splitTextToSize(item.description, contentWidth - 25);
      for (const line of lines.slice(0, 2)) {
        checkPageBreak(4);
        doc.text(line, margin + 2, y);
        y += 3.8;
      }
      doc.setTextColor(0, 0, 0);
    }

    if (hasAllergens) {
      const allergenLabels = (item.allergens as (string | number)[])
        .map((id: string | number) => {
          const a = allergensMap.get(Number(id));
          return a ? `${a.emoji} ${a.name}` : null;
        })
        .filter(Boolean);
      if (allergenLabels.length > 0) {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(140, 100, 40);
        const allergenText = `Allergeni: ${allergenLabels.join(", ")}`;
        const lines = doc.splitTextToSize(allergenText, contentWidth - 5);
        for (const line of lines.slice(0, 2)) {
          checkPageBreak(4);
          doc.text(line, margin + 2, y);
          y += 3.5;
        }
        doc.setTextColor(0, 0, 0);
      }
    }

    y += 2.5;
  }
  y += 4;
  return y;
}

function formatPrices(prices: any[]): string {
  if (!prices || prices.length === 0) return "";
  return prices.map((p: any) => {
    const size = p.size || p.format || "";
    const price = p.price ? `\u20AC${parseFloat(p.price).toFixed(2)}` : "";
    return size ? `${size} ${price}` : price;
  }).filter(Boolean).join(" | ");
}

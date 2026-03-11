import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
}

export function SEO({ title, description, image, url, type = "website", noindex = false }: SEOProps) {
  const defaultTitle = "Fermenta.to — Birra Artigianale Italiana";
  const defaultDescription = "Scopri pub, birrifici e birre artigianali italiane. La piattaforma per gli amanti della birra craft.";
  const defaultImage = "https://fermenta.to/og-image.jpg";
  const defaultUrl = "https://fermenta.to";

  const finalTitle = title || defaultTitle;
  const finalDesc = description || defaultDescription;
  const finalImage = image || defaultImage;
  const finalUrl = url || defaultUrl;

  useEffect(() => {
    document.title = finalTitle;

    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", finalDesc);
    setMeta("robots", noindex ? "noindex,nofollow" : "index,follow");

    setMeta("og:title", finalTitle, true);
    setMeta("og:description", finalDesc, true);
    setMeta("og:image", finalImage, true);
    setMeta("og:url", finalUrl, true);
    setMeta("og:type", type, true);
    setMeta("og:site_name", "Fermenta.to", true);
    setMeta("og:locale", "it_IT", true);

    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", finalTitle);
    setMeta("twitter:description", finalDesc);
    setMeta("twitter:image", finalImage);

    const canonical = document.querySelector('link[rel="canonical"]') || (() => {
      const el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      document.head.appendChild(el);
      return el;
    })();
    canonical.setAttribute("href", finalUrl);
  }, [finalTitle, finalDesc, finalImage, finalUrl, type, noindex]);

  return null;
}

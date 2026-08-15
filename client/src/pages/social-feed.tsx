/**
 * social-feed.tsx — redirects to the unified Community page.
 * The /feed route in App.tsx already does window.location.replace("/community"),
 * but this export is kept in case any lazy import still references it.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function SocialFeedRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/community", { replace: true }); }, []);
  return null;
}

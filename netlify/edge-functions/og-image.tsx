import type { Config } from "@netlify/edge-functions";
import { ImageResponse } from "https://deno.land/x/og_edge/mod.ts";

const SUPABASE_URL = "https://hozlyddiqodvjguqywty.supabase.co";
const BRAND = "SE LOGER CM";

function parseSlug(request: Request): string | null {
  const url = new URL(request.url);
  const pathnameMatch = url.pathname.match(/^\/og-image\/([^/?#]+)/)?.[1];
  const querySlug = url.searchParams.get("slug");
  return decodeURIComponent(pathnameMatch || querySlug || "").trim() || null;
}

function formatPrice(value: unknown, mode: string | null) {
  const amount = Number(value || 0).toLocaleString("fr-FR") + " FCFA";
  return mode === "sale" ? amount : `${amount}/mois`;
}

async function fetchListing(slug: string) {
  const key = Netlify.env.get("SB_ANON_KEY");
  if (!key) return null;

  const apiUrl = `${SUPABASE_URL}/rest/v1/listings?slug=eq.${encodeURIComponent(slug)}&select=title,price,rent_sale,city,district,type&limit=1`;

  const res = await fetch(apiUrl, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0] || null;
}

function genericCard() {
  return {
    title: "Trouvez votre bien immobilier",
    location: "Douala · Cameroun",
    price: "Locations · Ventes · Terrains",
    badge: "Immobilier local",
  };
}

export default async (request: Request) => {
  const slug = parseSlug(request);
  const listing = slug ? await fetchListing(slug) : null;

  const card = listing
    ? {
        title: String(listing.title || "Annonce immobilière"),
        location: [listing.district, listing.city].filter(Boolean).join(", ") || "Douala",
        price: formatPrice(listing.price, listing.rent_sale),
        badge: listing.rent_sale === "sale" ? "À vendre" : "À louer",
      }
    : genericCard();

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #111827 0%, #1f2937 55%, #ff7a00 100%)",
          color: "#ffffff",
          padding: "54px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              maxWidth: "760px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 18px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.14)",
                fontSize: "26px",
                fontWeight: 700,
              }}
            >
              {card.badge}
            </div>
            <div style={{ fontSize: "58px", fontWeight: 800, lineHeight: 1.08 }}>
              {card.title}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "24px", opacity: 0.85 }}>Immobilier Cameroun</div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: 800,
                padding: "14px 20px",
                background: "#ffffff",
                color: "#111827",
                borderRadius: "18px",
              }}
            >
              {BRAND}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "24px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "30px", opacity: 0.9 }}>{card.location}</div>
            <div style={{ fontSize: "54px", fontWeight: 900 }}>{card.price}</div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              fontSize: "24px",
              opacity: 0.9,
            }}
          >
            <div>selogercm.com</div>
            <div>Partage optimisé Facebook & WhatsApp</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=86400",
      },
    },
  );
};

export const config: Config = {
  path: "/og-image/*",
};

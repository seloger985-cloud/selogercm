// netlify/functions/og.js

exports.handler = async (event) => {
  try {
    const path = event.path || "";
    const slug = path.replace("/share/", "").trim();

    const site = "https://selogercm.com";
    const pageUrl = `${site}/share/${slug}`;

    // Image OG stable (JPG/PNG recommandé pour WhatsApp)
    const ogImage =
      "https://hozlyddiqodvjguqywty.supabase.co/storage/v1/object/public/listing-images/listings/listing_1776010205589/photo_0_1776010205589.webp";

    const title = "SE LOGER CM | Immobilier Cameroun";
    const description =
      "Découvrez cette annonce immobilière sur SeLogerCM : location, vente, studios, appartements, villas et plus.";

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${title}</title>

<meta property="og:type" content="website">
<meta property="og:site_name" content="SE LOGER CM">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:locale" content="fr_FR">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${ogImage}">

<meta http-equiv="refresh" content="0; url=${site}/annonce/${slug}">
<link rel="canonical" href="${pageUrl}">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>

<body style="font-family:Arial,sans-serif;padding:30px">
<p>Redirection vers l'annonce...</p>
<p><a href="${site}/annonce/${slug}">Cliquer ici</a></p>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: html,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: "OG error",
    };
  }
};

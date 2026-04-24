const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function esc(v=''){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function firstImage(listing){
  if (!listing) return null;
  if (Array.isArray(listing.images) && listing.images.length) return listing.images[0];
  if (typeof listing.images === 'string'){
    try{
      const arr = JSON.parse(listing.images);
      if (Array.isArray(arr) && arr.length) return arr[0];
    }catch(e){}
  }
  return listing.image_url || listing.thumbnail_url || null;
}

exports.handler = async (event) => {
  try{
    const path = event.path || '';
    const slug = decodeURIComponent(path.replace('/share/','').replace(/^\/+/, '').trim());

    const site = 'https://selogercm.com';
    const canonical = `${site}/share/${slug}`;
    const target = `${site}/annonce/${slug}`;

    let title = 'SE LOGER CM | Immobilier Cameroun';
    let description = 'Découvrez cette annonce immobilière sur SeLogerCM.';
    let image = 'https://selogercm.com/assets/img/og-cover.jpg';

    if (SUPABASE_URL && SUPABASE_ANON_KEY && slug){
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data } = await supabase
        .from('listings')
        .select('*')
        .or(`slug.eq.${slug},share_slug.eq.${slug}`)
        .limit(1)
        .maybeSingle();

      if (data){
        const price = data.price ? `${Number(data.price).toLocaleString('fr-FR')} FCFA` : '';
        title = `${data.title || 'Annonce'} | SE LOGER CM`;
        description = `${data.district || ''}${data.city ? ' - ' + data.city : ''}${price ? ' • ' + price : ''}`.trim();
        image = firstImage(data) || image;
      }
    }

    const html = `<!DOCTYPE html><html lang="fr"><head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta property="og:type" content="website">
<meta property="og:site_name" content="SE LOGER CM">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${esc(target)}">
<link rel="canonical" href="${esc(canonical)}">
</head><body><p>Redirection...</p></body></html>`;

    return {
      statusCode: 200,
      headers: {"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-cache, no-store, must-revalidate"},
      body: html
    };
  }catch(e){
    return {statusCode:500, body:'OG function error'};
  }
};

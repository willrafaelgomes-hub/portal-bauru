const SUPABASE_URL = "https://dtkszimtovtqdojjpqsy.supabase.co";
const SUPABASE_KEY = "sb_publishable_sLtgD3fLRhSkrNWd_3M5Ww_a7q4gxJi";
const SITE_URL = "https://portalbauru.pages.dev";

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;"
  })[char]);
}

export async function onRequestGet() {
  const urls = [
    `${SITE_URL}/`,
    `${SITE_URL}/imoveis.html`
  ];

  try {
    const endpoint = new URL(`${SUPABASE_URL}/rest/v1/imoveis`);

    endpoint.searchParams.set("select", "id");
    endpoint.searchParams.set("publicado", "eq.true");
    endpoint.searchParams.set(
      "situacao",
      "not.in.(vendido,alugado)"
    );
    endpoint.searchParams.set("limit", "1000");

    const response = await fetch(endpoint.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao consultar imóveis: ${response.status}`);
    }

    const properties = await response.json();

    for (const property of properties) {
      if (
        property.id &&
        /^[0-9a-f-]{36}$/i.test(property.id)
      ) {
        const url = new URL(`${SITE_URL}/imovel.html`);
        url.searchParams.set("id", property.id);
        urls.push(url.toString());
      }
    }
  } catch (error) {
    console.error("Erro ao gerar sitemap:", error);

    return new Response(
      "Não foi possível gerar o sitemap neste momento.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const entries = urls.map((url) => (
    `  <url><loc>${escapeXml(url)}</loc></url>`
  )).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}

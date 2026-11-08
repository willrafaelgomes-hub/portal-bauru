
/*
  Portal Bauru Imoveis
  Sitemap automatico atualizado
  functions/sitemap.xml.js
*/

const SITE = 'https://portalbauru.pages.dev';
const API = 'https://dtkszimtovtqdojjpqsy.supabase.co';
const KEY = 'sb_publishable_sLtgD3fLRhSkrNWd_3M5Ww_a7q4gxJi';

function urlTag(url, lastmod) {
  const ultima = lastmod &&
    !Number.isNaN(new Date(lastmod).getTime())
      ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>`
      : '';

  return `<url><loc>${url.replace(/&/g, '&amp;')}</loc>${ultima}</url>`;
}

export async function onRequestGet(context) {
  try {
    const links = [
      urlTag(`${SITE}/`),
      urlTag(`${SITE}/imoveis`)
    ];

    const categorias = new Set();
    const limite = 500;

    for (let pagina = 0; pagina < 40; pagina++) {
      const endpoint = new URL(`${API}/rest/v1/imoveis`);

      endpoint.searchParams.set(
        'select',
        'id,tipo,finalidade,situacao,atualizado_em'
      );

      endpoint.searchParams.set('publicado', 'eq.true');
      endpoint.searchParams.set('order', 'id.asc');
      endpoint.searchParams.set('limit', String(limite));
      endpoint.searchParams.set(
        'offset',
        String(pagina * limite)
      );

      const resposta = await fetch(endpoint, {
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          Accept: 'application/json'
        }
      });

      if (!resposta.ok) {
        throw new Error(`Supabase: ${resposta.status}`);
      }

      const anuncios = await resposta.json();

      if (!Array.isArray(anuncios)) {
        throw new Error('Resposta inesperada');
      }

      for (const p of anuncios) {
        if (
          ['vendido', 'alugado'].includes(
            String(p.situacao || '').toLowerCase()
          )
        ) {
          continue;
        }

        const id = String(p.id || '');

        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        ) {
          continue;
        }

        links.push(
          urlTag(
            `${SITE}/imovel?id=${encodeURIComponent(id)}`,
            p.atualizado_em
          )
        );

        if (p.finalidade === 'venda') {
          const slug = {
            apartamento: 'apartamentos-a-venda-em-bauru',
            casa: 'casas-a-venda-em-bauru',
            terreno: 'terrenos-a-venda-em-bauru'
          }[p.tipo];

          if (slug) {
            categorias.add(slug);
          }
        }
      }

      if (anuncios.length < limite) {
        break;
      }
    }

    for (const slug of categorias) {
      links.push(
        urlTag(`${SITE}/imoveis/${slug}`)
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${links.join('\n')}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=300'
      }
    });

  } catch (erro) {
    console.error('Sitemap:', erro);

    return context.next();
  }
}


/*
  PORTAL BAURU IMOVEIS
  SEO local automatico por bairro + sitemap + links da home
  Arquivo completo: functions/_middleware.js
*/

const SITE = 'https://portalbauru.pages.dev';
const API = 'https://dtkszimtovtqdojjpqsy.supabase.co';
const KEY = 'sb_publishable_sLtgD3fLRhSkrNWd_3M5Ww_a7q4gxJi';

const CATEGORIAS = [
  ['catApartamento', 'apartamentos-a-venda-em-bauru'],
  ['catCasa', 'casas-a-venda-em-bauru'],
  ['catTerreno', 'terrenos-a-venda-em-bauru']
];

const NAVEGACAO = `for (const [id, slug] of [
 ['catApartamento', 'apartamentos-a-venda-em-bauru'],
 ['catCasa', 'casas-a-venda-em-bauru'],
 ['catTerreno', 'terrenos-a-venda-em-bauru']
]) {
 document.getElementById(id).href = linked('imoveis/' + slug);
}`;

const PESSOAS = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': `${SITE}/#rafael`,
      name: 'W. Rafael Gomes',
      jobTitle: 'Corretor de Imóveis',
      identifier: {
        '@type': 'PropertyValue',
        propertyID: 'CRECI-SP',
        value: '196.907-F'
      },
      affiliation: { '@id': `${SITE}/#organizacao` }
    },
    {
      '@type': 'Person',
      '@id': `${SITE}/#debora`,
      name: 'Débora Navas',
      jobTitle: 'Corretora de Imóveis',
      identifier: {
        '@type': 'PropertyValue',
        propertyID: 'CRECI-SP',
        value: '196.899-F'
      },
      affiliation: { '@id': `${SITE}/#organizacao` }
    }
  ]
};

const CAMPOS = [
  'id', 'codigo', 'titulo', 'descricao', 'tipo',
  'finalidade', 'preco', 'bairro', 'quartos',
  'suites', 'vagas', 'area_privativa', 'situacao'
].join(',');

const ESTILO = `
:root{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#14253D;background:#F6F1EA}
*{box-sizing:border-box}body{margin:0}a{color:inherit}
header,footer{background:#14253D;color:#fff}
.wrap{max-width:1120px;margin:auto;padding:0 20px}
.top{min-height:84px;display:flex;justify-content:space-between;align-items:center;gap:15px}
.brand{text-decoration:none;font-size:20px;font-weight:850;letter-spacing:.02em}
.brand span{color:#F85F08}.brand small{display:block;font-size:10px;color:#D4DCE5;margin-top:5px;font-weight:400;letter-spacing:0}
.top-link{text-decoration:none;font-size:13px;padding:11px;border:1px solid #53677D;border-radius:9px;white-space:nowrap}
main{padding-top:32px;padding-bottom:62px}
.breadcrumb{font-size:13px;color:#667487}.breadcrumb a{color:#B34A0B;text-decoration:none}
h1{font-size:clamp(31px,4.7vw,47px);letter-spacing:-.04em;line-height:1.12;margin:23px 0 15px}
.intro{max-width:860px;line-height:1.7;color:#53647A;margin-bottom:28px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
.card{background:#fff;border:1px solid #E7E1D8;border-radius:15px;overflow:hidden;box-shadow:0 7px 23px #14253D0A}
.card-body{padding:20px}.card h2{font-size:21px;line-height:1.3;margin:0 0 11px}.card h2 a{text-decoration:none}
.label{font-size:12px;color:#B34A0B;font-weight:800;margin:0 0 11px}.small{font-size:13px;color:#627083;line-height:1.6}
.price{font-size:25px;font-weight:850;letter-spacing:-.03em;margin:16px 0}
.photo{display:grid;place-items:center;aspect-ratio:16/10;background:#DEE3E7;color:#657284;text-decoration:none;font-size:13px}
.photo img{display:block;width:100%;height:100%;object-fit:cover}
.action{display:inline-block;background:#F85F08;color:#fff;text-decoration:none;padding:12px 15px;border-radius:9px;font-size:13px;font-weight:800}
.guide{background:#fff;border:1px solid #E7E1D8;border-radius:15px;padding:24px;margin-top:35px;line-height:1.7;color:#526178}
.guide h2{color:#14253D;margin:0 0 9px;font-size:22px}
.empty{background:#fff;border:1px solid #E7E1D8;padding:24px;border-radius:14px;line-height:1.6}
.empty a{color:#B34A0B;font-weight:700}
.count{color:#627083;font-size:13px;font-weight:750;margin:18px 0}
footer{padding:27px 0;font-size:13px}footer p{color:#D4DCE5;margin:7px 0 0}
@media(max-width:700px){.grid{grid-template-columns:1fr}.top{min-height:76px}.brand{font-size:15px}.brand small{font-size:9px}.wrap{padding:0 16px}}
`;

function texto(v) {
  return String(v ?? '').replace(/\s+/g, ' ').trim();
}

function seguro(v) {
  return texto(v).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[c]);
}

function slugify(v) {
  return texto(v).normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function bairroValido(v) {
  const n = slugify(v);
  return n && ![
    'nao-informado', 'nao-informada', 'sem-bairro',
    'a-confirmar', 'n-a', 'indefinido', 'outro'
  ].includes(n);
}

function dinheiro(v) {
  const n = Number(v);
  if (v == null || v === '' || !Number.isFinite(n) || n <= 0) {
    return 'Valor sob consulta';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0
  }).format(n);
}

function comRef(destino, ref) {
  if (!ref) return destino;
  const u = new URL(destino, SITE);
  u.searchParams.set('ref', ref);
  return u.href;
}

function resposta(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

async function consultar(tabela, select, filtros) {
  const url = new URL(`${API}/rest/v1/${tabela}`);
  url.searchParams.set('select', select);
  for (const [k, v] of Object.entries(filtros)) {
    url.searchParams.set(k, String(v));
  }
  const r = await fetch(url, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      Accept: 'application/json'
    }
  });
  if (!r.ok) throw new Error(`${tabela}: ${r.status}`);
  const data = await r.json();
  if (!Array.isArray(data)) throw new Error('Resposta inesperada');
  return data;
}

async function imoveisPublicos(apenasBairros = false) {
  const todos = [];
  const limite = 500;
  for (let n = 0; n < 20; n++) {
    const dados = await consultar(
      'imoveis',
      apenasBairros ? 'bairro,situacao' : CAMPOS,
      {
        publicado: 'eq.true',
        order: 'id.asc',
        limit: limite,
        offset: n * limite
      }
    );
    todos.push(...dados);
    if (dados.length < limite) break;
  }
  return todos.filter(p =>
    bairroValido(p.bairro) &&
    !['vendido', 'alugado'].includes(texto(p.situacao).toLowerCase())
  );
}

function agruparPorBairro(imoveis) {
  const mapa = new Map();
  for (const p of imoveis) {
    const slug = slugify(p.bairro);
    if (!mapa.has(slug)) {
      mapa.set(slug, { slug, nome: texto(p.bairro), imoveis: [] });
    }
    mapa.get(slug).imoveis.push(p);
  }
  return [...mapa.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR')
  );
}

function estruturaSEO({ titulo, descricao, canonical, objeto, indexar }) {
  const json = JSON.stringify(objeto).replace(/</g, '\\u003c');
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#14253D">
<meta name="robots" content="${indexar ? 'index,follow,max-image-preview:large' : 'noindex,follow'}">
<title>${seguro(titulo)}</title>
<meta name="description" content="${seguro(descricao)}">
<link rel="canonical" href="${seguro(canonical)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Portal Bauru Imóveis">
<meta property="og:title" content="${seguro(titulo)}">
<meta property="og:description" content="${seguro(descricao)}">
<meta property="og:url" content="${seguro(canonical)}">
<script type="application/ld+json">${json}</script>
<style>${ESTILO}</style>`;
}

function corpoPagina(head, corpo, ref) {
  return `<!doctype html><html lang="pt-BR"><head>${head}</head>
<body>
<header><div class="wrap top">
<a class="brand" href="${seguro(comRef(`${SITE}/`, ref))}">PORTAL <span>BAURU</span> IMÓVEIS
<small>Conectando pessoas às oportunidades certas.</small></a>
<a class="top-link" href="${seguro(comRef(`${SITE}/imoveis`, ref))}">Pesquisar imóveis</a>
</div></header>
<main class="wrap">${corpo}</main>
<footer><div class="wrap"><strong>PORTAL BAURU IMÓVEIS</strong>
<p>W. Rafael Gomes · CRECI 196.907-F &amp; Débora Navas · CRECI 196.899-F · Bauru/SP</p>
</div></footer></body></html>`;
}

function erro404(ref) {
  const head = estruturaSEO({
    titulo: 'Bairro não encontrado | Portal Bauru Imóveis',
    descricao: 'Veja os imóveis disponíveis em Bauru.',
    canonical: `${SITE}/bairros`,
    objeto: {},
    indexar: false
  });
  return resposta(corpoPagina(head, `<h1>Bairro não encontrado</h1>
<p>Não há anúncios públicos para esse endereço.</p>
<a class="action" href="${seguro(comRef(`${SITE}/bairros`, ref))}">Ver bairros</a>`, ref), 404);
}

async function capaDosImoveis(lista) {
  const fotos = new Map();
  const ids = lista.slice(0, 60)
    .map(p => texto(p.id))
    .filter(id => /^[0-9a-f-]{36}$/i.test(id));
  if (!ids.length) return fotos;
  try {
    const rows = await consultar('imovel_fotos', 'imovel_id,caminho,ordem', {
      imovel_id: `in.(${ids.join(',')})`,
      order: 'ordem.asc',
      limit: 500
    });
    for (const f of rows) {
      if (!f.caminho || fotos.has(f.imovel_id)) continue;
      const caminho = String(f.caminho)
        .split('/').map(encodeURIComponent).join('/');
      fotos.set(
        f.imovel_id,
        `${API}/storage/v1/object/public/portal-imoveis/${caminho}`
      );
    }
  } catch (e) {
    console.warn('Capas dos bairros:', e.message);
  }
  return fotos;
}

async function paginaDeBairros(context, slug) {
  const url = new URL(context.request.url);
  const refParam = url.searchParams.get('ref');
  const ref = ['rafael', 'debora'].includes(refParam) ? refParam : null;

  let bairros;
  try {
    bairros = agruparPorBairro(await imoveisPublicos(false));
  } catch (e) {
    console.error('Bairros:', e);
    return new Response('Não foi possível consultar os bairros agora.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  const breadcrumb = `<nav class="breadcrumb" aria-label="Navegação">
<a href="${seguro(comRef(`${SITE}/`, ref))}">Início</a> /
<a href="${seguro(comRef(`${SITE}/bairros`, ref))}">Bairros</a>`;

  if (!slug) {
    const canonical = `${SITE}/bairros`;
    const titulo = 'Imóveis por bairro em Bauru/SP | Portal Bauru Imóveis';
    const descricao = 'Explore os bairros com imóveis anunciados em Bauru/SP. Consulte opções publicadas, valores e características no Portal Bauru Imóveis.';
    const itens = bairros.map(b => ({
      '@type': 'ListItem',
      position: bairros.indexOf(b) + 1,
      name: b.nome,
      url: `${SITE}/bairros/${b.slug}`
    }));
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'CollectionPage', url: canonical, name: titulo, description: descricao, inLanguage: 'pt-BR' },
        { '@type': 'ItemList', numberOfItems: bairros.length, itemListElement: itens }
      ]
    };
    const head = estruturaSEO({
      titulo, descricao, canonical, objeto: schema,
      indexar: bairros.length > 0
    });
    const cards = bairros.map(b => {
      const venda = b.imoveis.filter(p => p.finalidade === 'venda').length;
      const locacao = b.imoveis.filter(p => p.finalidade === 'locacao').length;
      const termos = [
        venda ? `${venda} à venda` : '',
        locacao ? `${locacao} para alugar` : ''
      ].filter(Boolean).join(' · ');
      return `<article class="card"><div class="card-body">
<p class="label">Bauru/SP</p>
<h2><a href="${seguro(comRef(`${SITE}/bairros/${b.slug}`, ref))}">${seguro(b.nome)}</a></h2>
<p class="small">${b.imoveis.length} imóvel(is) publicado(s)${termos ? ` · ${seguro(termos)}` : ''}</p>
<a class="action" href="${seguro(comRef(`${SITE}/bairros/${b.slug}`, ref))}">Ver imóveis no bairro</a>
</div></article>`;
    }).join('');
    const corpo = `${breadcrumb}</nav>
<h1>Imóveis por bairro em Bauru</h1>
<p class="intro">Encontre imóveis nos bairros de Bauru que possuem anúncios publicados no Portal. A relação é atualizada automaticamente conforme novos imóveis são cadastrados.</p>
<p class="count">${bairros.length} bairro(s) com anúncios</p>
${bairros.length ? `<section class="grid" aria-label="Bairros">${cards}</section>` : `<div class="empty">Ainda não há bairros com anúncios disponíveis. <a href="${SITE}/imoveis">Ver imóveis</a>.</div>`}
<section class="guide"><h2>Como pesquisar por bairro?</h2>
<p>Compare as opções disponíveis, a localização informada em cada anúncio e as características dos imóveis. Informações de financiamento e disponibilidade devem ser confirmadas individualmente.</p></section>`;
    return resposta(corpoPagina(head, corpo, ref));
  }

  const bairro = bairros.find(b => b.slug === slug);
  if (!bairro) return erro404(ref);

  const imoveis = bairro.imoveis;
  const venda = imoveis.filter(p => p.finalidade === 'venda').length;
  const locacao = imoveis.filter(p => p.finalidade === 'locacao').length;
  const assunto = venda && !locacao ? 'à venda' : locacao && !venda ? 'para alugar' : 'à venda e para alugar';
  const canonical = `${SITE}/bairros/${bairro.slug}`;
  const titulo = `Imóveis ${assunto} no ${bairro.nome}, Bauru/SP | Portal Bauru Imóveis`;
  const descricao = `Confira ${imoveis.length} imóvel(is) ${assunto} no bairro ${bairro.nome}, em Bauru/SP. Veja anúncios publicados, preços, fotografias e características.`;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        url: canonical,
        name: titulo,
        description: descricao,
        inLanguage: 'pt-BR',
        about: {
          '@type': 'Place',
          name: `${bairro.nome}, Bauru, São Paulo`,
          address: { '@type': 'PostalAddress', addressLocality: 'Bauru', addressRegion: 'SP', addressCountry: 'BR' }
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Bairros', item: `${SITE}/bairros` },
          { '@type': 'ListItem', position: 3, name: bairro.nome, item: canonical }
        ]
      },
      {
        '@type': 'ItemList',
        numberOfItems: imoveis.length,
        itemListElement: imoveis.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: texto(p.titulo) || 'Imóvel em Bauru',
          url: `${SITE}/imovel?id=${encodeURIComponent(p.id)}`
        }))
      }
    ]
  };
  // Páginas com um único anúncio continuam acessíveis, mas não são
  // enviadas para indexação até oferecerem uma seleção mais útil.
  const head = estruturaSEO({ titulo, descricao, canonical, objeto: schema, indexar: imoveis.length >= 2 });
  const fotos = await capaDosImoveis(imoveis);
  const cards = imoveis.map(p => {
    const link = comRef(`${SITE}/imovel?id=${encodeURIComponent(p.id)}`, ref);
    const nome = texto(p.titulo) || 'Imóvel em Bauru';
    const partes = [
      p.quartos != null ? `${p.quartos} quarto(s)` : '',
      Number(p.suites) > 0 ? `${p.suites} suíte(s)` : '',
      p.vagas != null ? `${p.vagas} vaga(s)` : '',
      Number(p.area_privativa) > 0 ? `${p.area_privativa} m²` : ''
    ].filter(Boolean).join(' · ');
    const foto = fotos.get(p.id);
    const capa = foto
      ? `<img src="${seguro(foto)}" alt="Fotografia cadastrada de ${seguro(nome)}" loading="lazy">`
      : 'Fotografias em breve';
    return `<article class="card">
<a class="photo" href="${seguro(link)}">${capa}</a>
<div class="card-body">
<p class="label">${p.finalidade === 'locacao' ? 'Para alugar' : 'À venda'} · ${seguro(bairro.nome)}, Bauru</p>
<h2><a href="${seguro(link)}">${seguro(nome)}</a></h2>
${partes ? `<p class="small">${seguro(partes)}</p>` : ''}
${texto(p.descricao) ? `<p class="small">${seguro(texto(p.descricao).slice(0, 155))}</p>` : ''}
<p class="price">${seguro(dinheiro(p.preco))}</p>
<a class="action" href="${seguro(link)}">Ver detalhes do imóvel</a>
</div></article>`;
  }).join('');
  const corpo = `${breadcrumb} / ${seguro(bairro.nome)}</nav>
<h1>Imóveis ${seguro(assunto)} no ${seguro(bairro.nome)}, em Bauru</h1>
<p class="intro">Confira as oportunidades cadastradas no Portal Bauru Imóveis para o bairro ${seguro(bairro.nome)}. Consulte valores, fotografias e características de cada anúncio e converse com nossa equipe para confirmar as condições e agendar visitas.</p>
<p class="count">${imoveis.length} imóvel(is) publicado(s)${venda ? ` · ${venda} à venda` : ''}${locacao ? ` · ${locacao} para alugar` : ''}</p>
<section class="grid" aria-label="Imóveis no bairro">${cards}</section>
<section class="guide"><h2>Comprar ou alugar no ${seguro(bairro.nome)}</h2>
<p>Compare os imóveis disponíveis, o espaço interno, as condições de negociação e a localização indicada em cada anúncio. Os preços e a disponibilidade podem mudar e devem ser confirmados antes de uma visita.</p>
<p><a href="${seguro(comRef(`${SITE}/bairros`, ref))}">Conhecer outros bairros de Bauru</a></p></section>`;
  return resposta(corpoPagina(head, corpo, ref));
}

async function enriquecerSitemap(context) {
  const original = await context.next();
  if (!original.ok) return original;
  let xml = await original.clone().text();
  if (!xml.includes('</urlset>')) return original;
  try {
    const bairros = agruparPorBairro(await imoveisPublicos(true));
    if (!bairros.length) return original;
    const entradas = [`<url><loc>${SITE}/bairros</loc></url>`];
    for (const b of bairros) {
      if (b.imoveis.length >= 2) {
        entradas.push(`<url><loc>${SITE}/bairros/${b.slug}</loc></url>`);
      }
    }
    xml = xml.replace('</urlset>', `${entradas.join('\n')}\n</urlset>`);
    const headers = new Headers(original.headers);
    headers.set('Content-Type', 'application/xml; charset=utf-8');
    headers.delete('Content-Length');
    headers.delete('Content-Encoding');
    headers.delete('ETag');
    return new Response(xml, { status: 200, headers });
  } catch (e) {
    console.error('Sitemap bairros:', e);
    return original;
  }
}

async function enriquecerHome(context) {
  const original = await context.next();
  if (!original.ok || !original.headers.get('content-type')?.includes('text/html')) {
    return original;
  }
  let pagina = await original.clone().text();
  const inicio = pagina.indexOf('for(const [id,tipo] of [');
  const fim = pagina.indexOf("\ndocument.getElementById('searchForm')", inicio);
  if (inicio < 0 || fim < 0 || !pagina.includes('id="catApartamento"')) {
    return original;
  }

  // Mantém os três links de categoria e o rastreamento ?ref.
  pagina = pagina.slice(0, inicio) + NAVEGACAO + '\n' + pagina.slice(fim);
  for (const [id, slug] of CATEGORIAS) {
    const padrao = new RegExp(`(<a\\b[^>]*\\bid="${id}"[^>]*\\bhref=")[^"]*(")`, 'i');
    pagina = pagina.replace(padrao, `$1/imoveis/${slug}$2`);
  }

  const identidade = `<script type="application/ld+json" id="equipe-seo">${JSON.stringify(PESSOAS).replace(/</g, '\\u003c')}</script>`;
  pagina = pagina.replace('</head>', `${identidade}\n</head>`);

  // Insere links de bairro apenas se existirem anúncios públicos.
  try {
    const bairros = agruparPorBairro(await imoveisPublicos(true));
    if (bairros.length) {
      const lista = bairros.slice(0, 12).map(b =>
        `<a href="/bairros/${b.slug}" style="display:inline-block;padding:9px 12px;border:1px solid #D5DDE4;border-radius:9px;text-decoration:none;color:#14253D;background:#fff;font-weight:650;font-size:13px">${seguro(b.nome)} (${b.imoveis.length})</a>`
      ).join('\n');
      const bloco = `<div class="bairros-seo" style="margin-top:28px">
<h3 style="font-size:20px;margin:0 0 9px">Imóveis por bairro em Bauru</h3>
<p style="font-size:14px;color:#53647A;margin:0 0 15px">Explore os bairros com imóveis anunciados no Portal Bauru.</p>
<div style="display:flex;flex-wrap:wrap;gap:9px">${lista}</div>
<a href="/bairros" style="display:inline-block;color:#B34A0B;margin-top:15px;font-size:14px;font-weight:750">Ver todos os bairros com imóveis</a>
</div>`;
      pagina = pagina.replace(/(<div class="local-links"[^>]*>[\s\S]*?<\/div>)/i, `$1\n${bloco}`);
    }
  } catch (e) {
    console.warn('Links dos bairros na home:', e.message);
  }

  const headers = new Headers(original.headers);
  headers.delete('Content-Length');
  headers.delete('Content-Encoding');
  headers.delete('ETag');
  return new Response(pagina, {
    status: original.status,
    statusText: original.statusText,
    headers
  });
}

export async function onRequestGet(context) {
  const path = new URL(context.request.url).pathname.replace(/\/$/, '') || '/';

  if (path === '/bairros') return paginaDeBairros(context, '');
  const match = /^\/bairros\/([a-z0-9-]+)$/.exec(path);
  if (match) return paginaDeBairros(context, match[1]);

  if (path === '/sitemap.xml') return enriquecerSitemap(context);
  if (['/', '/index', '/index.html'].includes(path)) return enriquecerHome(context);

  return context.next();
}

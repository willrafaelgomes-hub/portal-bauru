
/*
  PORTAL BAURU IMOVEIS
  SEO + GEO automatico dos anuncios
  Arquivo: functions/imovel.js
*/

const SUPABASE =
  'https://dtkszimtovtqdojjpqsy.supabase.co';

const PUBLIC_KEY =
  'sb_publishable_sLtgD3fLRhSkrNWd_3M5Ww_a7q4gxJi';

const SITE = 'https://portalbauru.pages.dev';

const tipos = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  sobrado: 'Sobrado',
  terreno: 'Terreno',
  chacara: 'Chácara',
  comercial: 'Imóvel comercial',
  outro: 'Imóvel'
};

function texto(valor) {
  return String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlSeguro(valor) {
  return texto(valor).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

function dinheiro(valor) {
  const n = Number(valor);

  if (
    valor == null ||
    valor === '' ||
    !Number.isFinite(n) ||
    n <= 0
  ) {
    return 'Valor sob consulta';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(n);
}

function naoEncontrado() {
  const corpo = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport"
  content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,follow">
<title>Imóvel indisponível | Portal Bauru Imóveis</title>
</head>
<body style="font:16px system-ui;background:#F6F1EA;color:#14253D;margin:0;padding:45px 22px">
<main style="max-width:720px;margin:auto">
<h1>Este imóvel não está disponível</h1>
<p>O anúncio pode ter sido retirado ou o endereço pode estar incorreto.</p>
<a href="${SITE}/imoveis"
  style="color:#B34A0B;font-weight:700">
Ver imóveis em Bauru
</a>
</main>
</body>
</html>`;

  return new Response(corpo, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

async function consultar(tabela, campos, filtros) {
  const endpoint = new URL(
    `${SUPABASE}/rest/v1/${tabela}`
  );

  endpoint.searchParams.set('select', campos);

  for (const [chave, valor] of Object.entries(filtros)) {
    endpoint.searchParams.set(chave, valor);
  }

  const resposta = await fetch(endpoint, {
    headers: {
      apikey: PUBLIC_KEY,
      Authorization: `Bearer ${PUBLIC_KEY}`,
      Accept: 'application/json'
    }
  });

  if (!resposta.ok) {
    throw new Error(
      `Supabase ${tabela}: ${resposta.status}`
    );
  }

  return resposta.json();
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id') || '';

  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuid.test(id)) {
    return naoEncontrado();
  }

  let imovel;
  let imagem = '';

  try {
    const registros = await consultar(
      'imoveis',
      [
        'id', 'codigo', 'titulo', 'descricao',
        'finalidade', 'tipo', 'empreendimento',
        'preco', 'bairro', 'area_privativa',
        'quartos', 'suites', 'banheiros',
        'vagas', 'situacao', 'publicado'
      ].join(','),
      {
        id: `eq.${id}`,
        publicado: 'eq.true',
        limit: '1'
      }
    );

    imovel = registros[0];

    if (
      !imovel ||
      ['vendido', 'alugado'].includes(
        texto(imovel.situacao).toLowerCase()
      )
    ) {
      return naoEncontrado();
    }

    // Usa somente fotografia real cadastrada.
    try {
      const fotos = await consultar(
        'imovel_fotos',
        'caminho',
        {
          imovel_id: `eq.${id}`,
          order: 'ordem.asc',
          limit: '1'
        }
      );

      if (fotos[0]?.caminho) {
        const caminho = String(fotos[0].caminho)
          .split('/')
          .map(encodeURIComponent)
          .join('/');

        imagem =
          `${SUPABASE}/storage/v1/object/public/portal-imoveis/${caminho}`;
      }
    } catch (erroFoto) {
      console.warn(
        'Foto SEO indisponível:',
        erroFoto.message
      );
    }

  } catch (erro) {
    console.error('Consulta SEO:', erro);

    // Mantém o carregamento original se
    // houver uma falha temporária no banco.
    return context.next();
  }

  // Preserva a página original.
  const original = await context.next();

  if (
    !original.ok ||
    !original.headers.get('content-type')
      ?.includes('text/html')
  ) {
    return original;
  }

  let pagina;

  try {
    pagina = await original.clone().text();
  } catch {
    return original;
  }

  if (
    !pagina.includes('id="seo-description"') ||
    !pagina.includes('id="status"')
  ) {
    return original;
  }

  const p = imovel;
  const tipo = tipos[p.tipo] || 'Imóvel';

  const finalidade =
    p.finalidade === 'locacao'
      ? 'para alugar'
      : 'à venda';

  const local = p.bairro
    ? `em ${texto(p.bairro)}, Bauru/SP`
    : 'em Bauru/SP';

  const nome =
    texto(p.titulo) ||
    `${tipo} ${finalidade} ${local}`;

  const titulo =
    `${nome} | Portal Bauru Imóveis`;

  const preco = dinheiro(p.preco);

  const detalhes = [
    p.quartos != null
      ? `${p.quartos} quarto(s)` : '',
    Number(p.suites) > 0
      ? `${p.suites} suíte(s)` : '',
    p.vagas != null
      ? `${p.vagas} vaga(s)` : '',
    Number(p.area_privativa) > 0
      ? `${p.area_privativa} m²` : ''
  ].filter(Boolean).join(', ');

  const descricao = [
    `${tipo} ${finalidade} ${local}.`,
    detalhes ? `${detalhes}.` : '',
    preco !== 'Valor sob consulta'
      ? `Preço: ${preco}.` : '',
    texto(p.descricao)
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 165)
    .trim();

  const canonica =
    `${SITE}/imovel?id=${encodeURIComponent(id)}`;

  const endereco = {
    '@type': 'PostalAddress',
    addressLocality: 'Bauru',
    addressRegion: 'SP',
    addressCountry: 'BR'
  };

  if (p.bairro) {
    endereco.addressSubregion = texto(p.bairro);
  }

  const habitacao = {
    '@type': 'Accommodation',
    name: nome,
    description: texto(p.descricao) || descricao,
    address: endereco
  };

  if (p.quartos != null) {
    habitacao.numberOfBedrooms = Number(p.quartos);
  }

  if (p.banheiros != null) {
    habitacao.numberOfBathroomsTotal =
      Number(p.banheiros);
  }

  if (Number(p.area_privativa) > 0) {
    habitacao.floorSize = {
      '@type': 'QuantitativeValue',
      value: Number(p.area_privativa),
      unitCode: 'MTK'
    };
  }

  if (imagem) {
    habitacao.image = imagem;
  }

  const dados = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': `${canonica}#anuncio`,
    url: canonica,
    name: nome,
    description: texto(p.descricao) || descricao,
    inLanguage: 'pt-BR',
    mainEntity: habitacao,
    publisher: {
      '@type': 'RealEstateAgent',
      name: 'Portal Bauru Imóveis',
      url: `${SITE}/`,
      areaServed: {
        '@type': 'City',
        name: 'Bauru'
      }
    }
  };

  if (Number(p.preco) > 0) {
    dados.offers = {
      '@type': 'Offer',
      price: Number(p.preco),
      priceCurrency: 'BRL',
      availability: p.situacao === 'reservado'
        ? 'https://schema.org/LimitedAvailability'
        : 'https://schema.org/InStock',
      url: canonica
    };
  }

  if (imagem) {
    dados.image = imagem;
  }

  // Metadados reais entregues no HTML.
  pagina = pagina
    .replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${htmlSeguro(titulo)}</title>`
    )
    .replace(
      /<meta name="description"[^>]*>/i,
      `<meta name="description" id="seo-description" content="${htmlSeguro(descricao)}">`
    )
    .replace(
      /<meta property="og:title"[^>]*>/i,
      `<meta property="og:title" id="og-title" content="${htmlSeguro(titulo)}">`
    )
    .replace(
      /<meta property="og:description"[^>]*>/i,
      `<meta property="og:description" id="og-description" content="${htmlSeguro(descricao)}">`
    )
    .replace(
      /<meta property="og:url"[^>]*>/i,
      `<meta property="og:url" id="og-url" content="${htmlSeguro(canonica)}">`
    );

  const extras = [
    `<link rel="canonical" href="${htmlSeguro(canonica)}">`,
    imagem
      ? `<meta property="og:image" content="${htmlSeguro(imagem)}">`
      : '',
    `<script type="application/ld+json" id="seo-structured-data">${JSON.stringify(dados).replace(/</g, '\\u003c')}</script>`
  ].filter(Boolean).join('\n');

  pagina = pagina.replace(
    '</head>',
    `${extras}\n</head>`
  );

  // Conteúdo real disponível mesmo antes
  // da execução do JavaScript.
  const resumo = `
<div id="status" class="status" role="status">
  <h1>${htmlSeguro(nome)}</h1>
  <p>${htmlSeguro(`${tipo} ${finalidade} ${local}.`)}</p>
  ${detalhes
    ? `<p>${htmlSeguro(detalhes)}</p>`
    : ''}
  <p><strong>${htmlSeguro(preco)}</strong></p>
  ${texto(p.descricao)
    ? `<p>${htmlSeguro(texto(p.descricao).slice(0, 450))}</p>`
    : ''}
</div>`;

  pagina = pagina.replace(
    /<div id="status" class="status" role="status">[\s\S]*?<\/div>/i,
    resumo
  );

  // URL canônica consistente.
  pagina = pagina.replace(
    "function canonicalUrl(propertyId){\nconst url=new URL('imovel.html',location.href);",
    "function canonicalUrl(propertyId){\nconst url=new URL('imovel',location.href);"
  );

  // Evita duplicação dos dados estruturados
  // após o carregamento completo.
  pagina = pagina.replace(
    "const old=document.getElementById('property-structured-data');",
    "document.getElementById('seo-structured-data')?.remove();\nconst old=document.getElementById('property-structured-data');"
  );

  const headers = new Headers(original.headers);

  headers.set(
    'Content-Type',
    'text/html; charset=utf-8'
  );

  headers.set(
    'Cache-Control',
    'public, max-age=0, s-maxage=300'
  );

  headers.delete('Content-Length');
  headers.delete('ETag');
  headers.delete('Content-Encoding');

  return new Response(pagina, {
    status: 200,
    headers
  });
}


/*
  Portal Bauru Imoveis
  Paginas locais de categorias
  functions/imoveis/[categoria].js
*/

const SITE = 'https://portalbauru.pages.dev';
const API = 'https://dtkszimtovtqdojjpqsy.supabase.co';
const KEY = 'sb_publishable_sLtgD3fLRhSkrNWd_3M5Ww_a7q4gxJi';

const CATEGORIAS = {
  'apartamentos-a-venda-em-bauru': {
    tipo: 'apartamento',
    nome: 'Apartamentos',
    singular: 'Apartamento',
    dica: 'Compare a localização, a área privativa, os dormitórios, as vagas e as condições de cada condomínio antes de escolher um apartamento.'
  },
  'casas-a-venda-em-bauru': {
    tipo: 'casa',
    nome: 'Casas',
    singular: 'Casa',
    dica: 'Avalie o espaço interno e externo, a distribuição dos cômodos, a conservação e as condições de negociação de cada casa.'
  },
  'terrenos-a-venda-em-bauru': {
    tipo: 'terreno',
    nome: 'Terrenos',
    singular: 'Terreno',
    dica: 'Antes de comprar um terreno, confira a localização, a metragem, a documentação e as regras de construção aplicáveis ao endereço.'
  }
};

function texto(valor) {
  return String(valor ?? '').replace(/\s+/g, ' ').trim();
}

function seguro(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

function dinheiro(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === '' ||
    !Number.isFinite(Number(valor))
  ) {
    return 'Valor sob consulta';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(Number(valor));
}

function caminhoImagem(caminho) {
  return String(caminho)
    .split('/')
    .map(encodeURIComponent)
    .join('/');
}

function responder(html, status = 200, cache = 'public, max-age=0, s-maxage=300') {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': cache,
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

async function consultar(tabela, campos, filtros) {
  const endpoint = new URL(`${API}/rest/v1/${tabela}`);
  endpoint.searchParams.set('select', campos);

  for (const [chave, valor] of Object.entries(filtros)) {
    endpoint.searchParams.set(chave, valor);
  }

  const resposta = await fetch(endpoint, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      Accept: 'application/json'
    }
  });

  if (!resposta.ok) {
    throw new Error(`${tabela}: HTTP ${resposta.status}`);
  }

  const dados = await resposta.json();

  if (!Array.isArray(dados)) {
    throw new Error('Resposta inesperada do banco');
  }

  return dados;
}

export async function onRequestGet(context) {
  const slug = String(context.params.categoria || '');
  const categoria = CATEGORIAS[slug];

  if (!categoria) {
    return responder(
      '<!doctype html><html lang="pt-BR"><head><meta name="robots" content="noindex"><title>Página não encontrada</title></head><body><h1>Página não encontrada</h1><a href="/imoveis">Ver imóveis</a></body></html>',
      404
    );
  }

  let imoveis = [];
  const imagens = new Map();

  try {
    const registros = await consultar(
      'imoveis',
      'id,codigo,titulo,descricao,preco,bairro,quartos,suites,vagas,area_privativa,situacao',
      {
        publicado: 'eq.true',
        finalidade: 'eq.venda',
        tipo: `eq.${categoria.tipo}`,
        order: 'atualizado_em.desc',
        limit: '100'
      }
    );

    imoveis = registros.filter(p =>
      !['vendido', 'alugado'].includes(
        texto(p.situacao).toLowerCase()
      )
    );

    const ids = imoveis
      .map(p => String(p.id || ''))
      .filter(id => /^[0-9a-f-]{36}$/i.test(id));

    if (ids.length) {
      try {
        const fotos = await consultar(
          'imovel_fotos',
          'imovel_id,caminho,ordem',
          {
            imovel_id: `in.(${ids.join(',')})`,
            order: 'ordem.asc',
            limit: '400'
          }
        );

        for (const foto of fotos) {
          if (
            foto.caminho &&
            !imagens.has(foto.imovel_id)
          ) {
            imagens.set(
              foto.imovel_id,
              `${API}/storage/v1/object/public/portal-imoveis/${caminhoImagem(foto.caminho)}`
            );
          }
        }
      } catch (erroFoto) {
        console.warn('Fotos da categoria:', erroFoto);
      }
    }

  } catch (erro) {
    console.error('Categoria:', erro);

    return responder(
      '<!doctype html><html lang="pt-BR"><head><meta name="robots" content="noindex"><title>Portal Bauru Imóveis</title></head><body><h1>Não foi possível carregar os imóveis agora.</h1><p>Tente novamente mais tarde.</p><a href="/imoveis">Pesquisar imóveis</a></body></html>',
      503,
      'no-store'
    );
  }

  const canonical = `${SITE}/imoveis/${slug}`;

  const titulo = `${categoria.nome} à venda em Bauru/SP | Portal Bauru Imóveis`;

  const descricao = `Encontre ${categoria.nome.toLowerCase()} à venda em Bauru/SP. Consulte anúncios publicados, bairros, preços, características e fotografias cadastradas no Portal Bauru Imóveis.`;

  const cartoes = imoveis.map(p => {
    const url = `${SITE}/imovel?id=${encodeURIComponent(p.id)}`;

    const nome = texto(p.titulo) ||
      `${categoria.singular} à venda em Bauru`;

    const local = texto(p.bairro)
      ? `${texto(p.bairro)} · Bauru/SP`
      : 'Bauru/SP';

    const caracteristicas = [
      p.quartos != null ? `${p.quartos} quarto(s)` : '',
      Number(p.suites) > 0 ? `${p.suites} suíte(s)` : '',
      p.vagas != null ? `${p.vagas} vaga(s)` : '',
      Number(p.area_privativa) > 0 ? `${p.area_privativa} m²` : ''
    ].filter(Boolean).join(' · ');

    const imagem = imagens.get(p.id);

    const resumo = texto(p.descricao).slice(0, 145);

    return `
    <article class="card">
      <a class="photo" href="${seguro(url)}" aria-label="Ver ${seguro(nome)}">
        ${imagem
          ? `<img src="${seguro(imagem)}" alt="Fotografia cadastrada de ${seguro(nome)}" loading="lazy">`
          : '<span>Fotografias em breve</span>'
        }
      </a>
      <div class="card-info">
        <p class="location">${seguro(local)}</p>
        <h2><a href="${seguro(url)}">${seguro(nome)}</a></h2>
        ${caracteristicas
          ? `<p class="details">${seguro(caracteristicas)}</p>`
          : ''
        }
        ${resumo
          ? `<p class="summary">${seguro(resumo)}</p>`
          : ''
        }
        <p class="price">${seguro(dinheiro(p.preco))}</p>
        <a class="more" href="${seguro(url)}">Ver detalhes do imóvel</a>
      </div>
    </article>`;
  }).join('\n');

  const dadosEstruturados = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': canonical,
        url: canonical,
        name: titulo,
        description: descricao,
        inLanguage: 'pt-BR',
        about: {
          '@type': 'Place',
          name: 'Bauru, São Paulo, Brasil'
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Início',
            item: `${SITE}/`
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Imóveis',
            item: `${SITE}/imoveis`
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: `${categoria.nome} à venda em Bauru`,
            item: canonical
          }
        ]
      },
      {
        '@type': 'ItemList',
        name: `${categoria.nome} à venda em Bauru`,
        numberOfItems: imoveis.length,
        itemListElement: imoveis.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE}/imovel?id=${encodeURIComponent(p.id)}`,
          name: texto(p.titulo) ||
            `${categoria.singular} à venda em Bauru`
        }))
      }
    ]
  };

  const json = JSON.stringify(dadosEstruturados)
    .replace(/</g, '\\u003c');

  const navegacao = Object.entries(CATEGORIAS)
    .map(([chave, item]) => `
      <a href="${SITE}/imoveis/${chave}"
        ${chave === slug ? 'aria-current="page"' : ''}>
        ${seguro(item.nome)} à venda
      </a>`)
    .join('');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#14253D">
<meta name="robots" content="${imoveis.length ? 'index,follow,max-image-preview:large' : 'noindex,follow'}">

<title>${seguro(titulo)}</title>
<meta name="description" content="${seguro(descricao)}">
<link rel="canonical" href="${seguro(canonical)}">

<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${seguro(titulo)}">
<meta property="og:description" content="${seguro(descricao)}">
<meta property="og:url" content="${seguro(canonical)}">

<script type="application/ld+json">${json}</script>

<style>
:root {
  font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
  background:#F6F1EA;
  color:#14253D;
}
* { box-sizing:border-box }
body { margin:0 }
a { color:inherit }
header,footer { background:#14253D;color:#fff }
.wrap { max-width:1120px;margin:auto;padding:0 22px }
.top {
  min-height:85px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:15px;
}
.brand {
  text-decoration:none;
  font-size:21px;
  font-weight:900;
}
.brand span { color:#F85F08 }
.brand small {
  display:block;
  font-size:11px;
  font-weight:400;
  color:#D4DCE5;
  margin-top:5px;
}
.header-link {
  font-size:13px;
  text-decoration:none;
  border:1px solid #66778C;
  border-radius:9px;
  padding:11px 13px;
}
main { padding-top:34px;padding-bottom:65px }
.crumb { font-size:13px;color:#667487 }
.crumb a { color:#B34A0B;text-decoration:none }
h1 {
  font-size:clamp(30px,5vw,48px);
  letter-spacing:-.04em;
  line-height:1.12;
  margin:22px 0 15px;
}
.intro {
  max-width:820px;
  line-height:1.7;
  color:#53647A;
}
.subnav {
  display:flex;
  flex-wrap:wrap;
  gap:9px;
  margin:25px 0 35px;
}
.subnav a {
  padding:10px 13px;
  border:1px solid #DCD9D4;
  background:#fff;
  border-radius:9px;
  text-decoration:none;
  font-weight:650;
  font-size:13px;
}
.subnav a[aria-current] {
  background:#14253D;
  border-color:#14253D;
  color:#fff;
}
.counter {
  font-size:14px;
  color:#657181;
  font-weight:700;
  margin-bottom:15px;
}
.cards {
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:20px;
}
.card {
  overflow:hidden;
  border:1px solid #E6E2DB;
  border-radius:16px;
  background:#fff;
  box-shadow:0 8px 25px #14253D0A;
}
.photo {
  display:grid;
  place-items:center;
  background:#DDE2E7;
  color:#627084;
  aspect-ratio:16/10;
  overflow:hidden;
  text-decoration:none;
  font-size:14px;
}
.photo img {
  height:100%;
  width:100%;
  object-fit:cover;
  display:block;
}
.card-info { padding:19px }
.location {
  color:#B34A0B;
  font-size:13px;
  font-weight:750;
  margin:0 0 10px;
}
h2 {
  font-size:22px;
  line-height:1.25;
  margin:0 0 10px;
  letter-spacing:-.02em;
}
h2 a { text-decoration:none }
.details,.summary {
  font-size:13px;
  color:#687587;
  line-height:1.55;
}
.price {
  font-weight:900;
  font-size:25px;
  margin:17px 0;
}
.more {
  display:inline-block;
  text-decoration:none;
  background:#F85F08;
  color:#fff;
  padding:12px 15px;
  border-radius:9px;
  font-weight:750;
  font-size:13px;
}
.empty,.guide {
  background:#fff;
  border:1px solid #E6E2DB;
  border-radius:14px;
  padding:25px;
  line-height:1.7;
}
.empty a,.guide a {
  color:#B34A0B;
  font-weight:700;
}
.guide { margin-top:40px }
.guide h2 { margin:0 0 8px }
footer { padding:28px 0;font-size:13px }
footer p { color:#D4DCE5;margin:6px 0 0 }
@media(max-width:700px) {
  .brand { font-size:16px }
  .brand small { font-size:9px }
  .header-link { font-size:11px }
  .cards { grid-template-columns:1fr }
  .wrap { padding:0 17px }
  .top { min-height:76px }
}
</style>
</head>
<body>

<header>
<div class="wrap top">
<a class="brand" href="${SITE}/">
  PORTAL <span>BAURU</span> IMÓVEIS
  <small>Conectando pessoas às oportunidades certas.</small>
</a>
<a class="header-link" href="${SITE}/imoveis">Pesquisar imóveis</a>
</div>
</header>

<main class="wrap">
<nav class="crumb" aria-label="Navegação">
  <a href="${SITE}/">Início</a> /
  <a href="${SITE}/imoveis">Imóveis</a> /
  ${seguro(categoria.nome)} à venda
</nav>

<h1>${seguro(categoria.nome)} à venda em Bauru/SP</h1>

<p class="intro">
  Consulte ${seguro(categoria.nome.toLowerCase())} à venda em Bauru,
  no interior de São Paulo. Os anúncios são carregados diretamente do
  cadastro público do Portal Bauru Imóveis, com informações disponíveis
  sobre preço, bairro, metragem e características. Para confirmar
  condições e agendar uma visita, entre na página do imóvel.
</p>

<nav class="subnav" aria-label="Categorias">
  ${navegacao}
</nav>

<p class="counter">
  ${imoveis.length} anúncio(s) disponível(is) nesta seleção
</p>

${imoveis.length
  ? `<section class="cards" aria-label="Anúncios">${cartoes}</section>`
  : `<section class="empty">
       <h2>Nenhum anúncio disponível nesta categoria agora</h2>
       <p>Consulte também todas as opções de compra e locação.
       Os imóveis publicados nesta categoria aparecerão automaticamente aqui.</p>
       <a href="${SITE}/imoveis">Ver todos os imóveis</a>
     </section>`
}

<section class="guide">
<h2>Como escolher ${seguro(categoria.nome.toLowerCase())} em Bauru?</h2>
<p>${seguro(categoria.dica)}</p>
<p>
  Valores, financiamento, uso de FGTS e disponibilidade dependem
  das condições de cada imóvel e devem ser confirmados com a equipe
  antes da negociação.
</p>
</section>
</main>

<footer>
<div class="wrap">
<strong>PORTAL BAURU IMÓVEIS</strong>
<p>W. Rafael Gomes · CRECI 196.907-F &amp;
Débora Navas · CRECI 196.899-F · Bauru/SP</p>
</div>
</footer>

</body>
</html>`;

  return responder(html);
}

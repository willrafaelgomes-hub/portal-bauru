
/*
 * Portal Bauru Imóveis
 * Integração da página inicial com páginas SEO locais
 * Arquivo: functions/_middleware.js
 */

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
      '@id': 'https://portalbauru.pages.dev/#rafael',
      name: 'W. Rafael Gomes',
      jobTitle: 'Corretor de Imóveis',
      identifier: {
        '@type': 'PropertyValue',
        propertyID: 'CRECI-SP',
        value: '196.907-F'
      },
      affiliation: {
        '@id': 'https://portalbauru.pages.dev/#organizacao'
      }
    },
    {
      '@type': 'Person',
      '@id': 'https://portalbauru.pages.dev/#debora',
      name: 'Débora Navas',
      jobTitle: 'Corretora de Imóveis',
      identifier: {
        '@type': 'PropertyValue',
        propertyID: 'CRECI-SP',
        value: '196.899-F'
      },
      affiliation: {
        '@id': 'https://portalbauru.pages.dev/#organizacao'
      }
    }
  ]
};

export async function onRequestGet(context) {
  const caminho = new URL(context.request.url).pathname;

  // Outras páginas continuam funcionando normalmente.
  if (!['/', '/index', '/index.html'].includes(caminho)) {
    return context.next();
  }

  const original = await context.next();

  if (
    !original.ok ||
    !original.headers.get('content-type')
      ?.includes('text/html')
  ) {
    return original;
  }

  let pagina = await original.clone().text();

  const inicio = pagina.indexOf(
    'for(const [id,tipo] of ['
  );

  const fim = pagina.indexOf(
    "\ndocument.getElementById('searchForm')",
    inicio
  );

  // Não modifica nada caso a estrutura original mude.
  if (
    inicio < 0 ||
    fim < 0 ||
    !pagina.includes('id="catApartamento"')
  ) {
    return original;
  }

  // Atualiza a navegação sem perder o ?ref dos corretores.
  pagina =
    pagina.slice(0, inicio) +
    NAVEGACAO +
    '\n' +
    pagina.slice(fim);

  // Links visíveis também para buscadores sem JavaScript.
  for (const [id, slug] of CATEGORIAS) {
    const padrao = new RegExp(
      `(<a\\b[^>]*\\bid="${id}"[^>]*\\bhref=")[^"]*(")`,
      'i'
    );

    pagina = pagina.replace(
      padrao,
      `$1/imoveis/${slug}$2`
    );
  }

  // Identificação dos profissionais nos dados estruturados.
  const identidade =
    `<script type="application/ld+json" id="equipe-seo">` +
    JSON.stringify(PESSOAS).replace(/</g, '\\u003c') +
    `</script>`;

  pagina = pagina.replace(
    '</head>',
    `${identidade}\n</head>`
  );

  const headers = new Headers(original.headers);

  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');

  return new Response(pagina, {
    status: original.status,
    statusText: original.statusText,
    headers
  });
}

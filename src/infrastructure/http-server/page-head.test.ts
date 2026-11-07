import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderPageHead, withPageHead, type PageHead } from './page-head.ts';

const HEAD: PageHead = {
  title: 'Ice Cave · Lair',
  description: 'A frozen cave.',
  url: 'https://lair.test/maps?map=ice-cave',
  image: { url: 'https://lair.test/maps/1/2/view.webp', alt: 'Ice Cave' },
};

const TEMPLATE = [
  '<head>',
  '    <!-- page-head -->',
  '    <title>Default</title>',
  '    <!-- /page-head -->',
  '    <link rel="icon" href="/favicon.ico" />',
  '</head>',
].join('\n');

describe('renderPageHead', () => {
  it('writes the title, description, canonical link and share tags', () => {
    const html = renderPageHead(HEAD);

    for (const tag of [
      '<title>Ice Cave · Lair</title>',
      '<meta name="description" content="A frozen cave." />',
      '<link rel="canonical" href="https://lair.test/maps?map=ice-cave" />',
      '<meta property="og:type" content="website" />',
      '<meta property="og:site_name" content="Lair of Artificer" />',
      '<meta property="og:title" content="Ice Cave · Lair" />',
      '<meta property="og:description" content="A frozen cave." />',
      '<meta property="og:url" content="https://lair.test/maps?map=ice-cave" />',
      '<meta property="og:image" content="https://lair.test/maps/1/2/view.webp" />',
      '<meta property="og:image:alt" content="Ice Cave" />',
      '<meta name="twitter:card" content="summary_large_image" />',
      '<meta name="twitter:title" content="Ice Cave · Lair" />',
      '<meta name="twitter:description" content="A frozen cave." />',
      '<meta name="twitter:image" content="https://lair.test/maps/1/2/view.webp" />',
    ]) {
      assert.ok(html.includes(tag), tag);
    }
    assert.doesNotMatch(html, /robots|og:image:width/);
  });

  it('adds the image size when it is known, and noindex on request', () => {
    const html = renderPageHead({
      ...HEAD,
      image: { ...HEAD.image, width: 1200, height: 630 },
      noindex: true,
    });

    assert.ok(
      html.includes('<meta property="og:image:width" content="1200" />'),
    );
    assert.ok(
      html.includes('<meta property="og:image:height" content="630" />'),
    );
    assert.ok(html.includes('<meta name="robots" content="noindex" />'));
  });

  it('escapes text from posts so it cannot add markup', () => {
    const html = renderPageHead({
      ...HEAD,
      title: '</title><script>alert(1)</script>',
      description: `"><img src=x onerror='alert(1)'> & more`,
    });

    assert.doesNotMatch(html, /<script|<img/);
    assert.ok(
      html.includes(
        '<title>&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;</title>',
      ),
    );
    assert.ok(
      html.includes(
        'content="&quot;&gt;&lt;img src=x onerror=&#39;alert(1)&#39;&gt; &amp; more"',
      ),
    );
  });
});

describe('structured data', () => {
  it('adds each object as a JSON-LD script after the share tags', () => {
    const html = renderPageHead({
      ...HEAD,
      structuredData: [{ '@type': 'WebSite' }, { '@type': 'Organization' }],
    });

    assert.ok(
      html.endsWith(
        [
          '<meta name="twitter:image" content="https://lair.test/maps/1/2/view.webp" />',
          '<script type="application/ld+json">{"@type":"WebSite"}</script>',
          '<script type="application/ld+json">{"@type":"Organization"}</script>',
        ].join('\n    '),
      ),
    );
  });

  it('adds no script without structured data', () => {
    assert.doesNotMatch(renderPageHead(HEAD), /<script/);
  });

  it('keeps text from posts from closing the script', () => {
    const html = renderPageHead({
      ...HEAD,
      structuredData: [{ name: '</script><script>alert(1)</script> & "x"' }],
    });

    assert.ok(
      html.includes(
        '{"name":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script> & \\"x\\""}</script>',
      ),
    );
    assert.equal(html.match(/<script/g)?.length, 1);
    assert.equal(html.match(/<\/script>/g)?.length, 1);
  });
});

describe('withPageHead', () => {
  it('replaces only the block between the markers', () => {
    const html = withPageHead(TEMPLATE, HEAD);

    assert.doesNotMatch(html, /Default/);
    assert.ok(html.includes('<title>Ice Cave · Lair</title>'));
    assert.ok(html.startsWith('<head>\n    <!-- page-head -->\n'));
    assert.ok(
      html.endsWith(
        '<!-- /page-head -->\n    <link rel="icon" href="/favicon.ico" />\n</head>',
      ),
    );
  });

  it('inserts replacement patterns as plain text', () => {
    const html = withPageHead(TEMPLATE, { ...HEAD, title: "$& $' $`" });

    assert.ok(html.includes('<title>$&amp; $&#39; $`</title>'));
  });

  it('leaves a template without markers alone', () => {
    assert.equal(withPageHead('<head></head>', HEAD), '<head></head>');
  });
});

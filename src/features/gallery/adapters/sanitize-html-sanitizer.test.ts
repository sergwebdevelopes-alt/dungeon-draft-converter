import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sanitizeWithSanitizeHtml as sanitize } from './sanitize-html-sanitizer.ts';

const SAFE_REL = 'target="_blank" rel="noopener noreferrer nofollow"';

describe('sanitizeWithSanitizeHtml', () => {
  it('keeps paragraphs, line breaks, emphasis and lists', () => {
    const html =
      '<p>Hi <strong>all</strong>, <em>enjoy</em><br />this</p><ul><li><p><b>One</b></p></li></ul><ol><li><i>Two</i></li></ol>';

    assert.equal(
      sanitize(html),
      '<p>Hi <strong>all</strong>, <em>enjoy</em><br />this</p><ul><li><p><b>One</b></p></li></ul><ol><li><i>Two</i></li></ol>',
    );
  });

  it('removes scripts, styles, images and every attribute', () => {
    assert.equal(
      sanitize(
        '<p style="color:red" class="x" onclick="steal()">Text</p><script>alert(1)</script><style>p{}</style><img src="https://cdn.test/1.jpg" onerror="steal()">',
      ),
      '<p>Text</p>',
    );
  });

  it('keeps the text of other tags without the tags', () => {
    assert.equal(
      sanitize('<div><h2>Title</h2><span>text</span></div>'),
      'Titletext',
    );
  });

  it('drops paragraphs that are empty, or only held an image', () => {
    assert.equal(
      sanitize(
        '<p></p><p> </p><p><img src="https://cdn.test/1.jpg"></p><p>Kept</p>',
      ),
      '<p>Kept</p>',
    );
  });

  it('opens https links in a new tab, without passing anything on', () => {
    assert.equal(
      sanitize(
        '<a href="https://www.patreon.com/x" onclick="steal()" rel="opener">Join</a>',
      ),
      `<a href="https://www.patreon.com/x" ${SAFE_REL}>Join</a>`,
    );
  });

  it('keeps only the text of links that are not https', () => {
    for (const href of [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      'http://example.com',
      '//evil.test/x',
      'data:text/html,<script>alert(1)</script>',
      '/relative',
    ]) {
      assert.equal(sanitize(`<a href="${href}">link</a>`), '<a>link</a>', href);
    }
  });

  it('cleans a real Patreon post as expected', () => {
    const post =
      '<p>The Blue Water Inn serves as the primary safe haven.</p><p>📦<strong> What’s inside:</strong></p><ul><li><p><strong>1-3 floor and roof</strong></p></li></ul><p></p><p><img src="https://c10.patreonusercontent.com/1.jpg?token-hash=x"></p>';

    assert.equal(
      sanitize(post),
      '<p>The Blue Water Inn serves as the primary safe haven.</p><p>📦<strong> What’s inside:</strong></p><ul><li><p><strong>1-3 floor and roof</strong></p></li></ul>',
    );
  });

  it('gives an empty text for an empty post', () => {
    assert.equal(sanitize(''), '');
    assert.equal(sanitize('<p></p>'), '');
  });
});

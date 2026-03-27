const test = require('node:test');
const assert = require('node:assert/strict');

test('article update route includes validation middleware before controller', () => {
  delete require.cache[require.resolve('../routes/articleRoutes')];
  const router = require('../routes/articleRoutes');

  const putLayer = router.stack.find((layer) => (
    layer.route?.path === '/:id' && layer.route?.methods?.put
  ));

  assert.ok(putLayer, 'expected PUT /:id route to exist');

  const middlewareNames = putLayer.route.stack.map((entry) => entry.name);
  assert.ok(middlewareNames.includes('validate'));
  assert.equal(middlewareNames.at(-1), 'updateArticle');
  assert.ok(middlewareNames.indexOf('validate') < middlewareNames.indexOf('updateArticle'));
});

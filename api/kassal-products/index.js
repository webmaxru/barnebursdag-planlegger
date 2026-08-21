const { getKassalProductsResponse } = require('../shared/handlers.cjs');

module.exports = async function (context, req) {
  context.res = await getKassalProductsResponse(req.query);
};

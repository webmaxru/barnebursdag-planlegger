const { getConfigResponse } = require('../shared/handlers.cjs');

module.exports = async function (context) {
  context.res = getConfigResponse();
};

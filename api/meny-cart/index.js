const { getMenyCartResponse } = require('../shared/handlers.cjs');

module.exports = async function (context, req) {
  const logger = context.log?.error ? context.log : console;
  context.res = await getMenyCartResponse(req.body, { logger });
};

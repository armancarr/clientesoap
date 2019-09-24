exports.RequestLoggerClientHandler = RequestLoggerClientHandler

function RequestLoggerClientHandler() {}

RequestLoggerClientHandler.prototype.send = function(ctx, callback) {
  ctx.logger = {
    request: ctx.request.toString(),
  }
  callback(ctx)
}

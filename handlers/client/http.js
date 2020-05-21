var utils = require('../../utils'),
  request = require('request'),
  fs = require('fs')

exports.HttpClientHandler = HttpClientHandler

function HttpClientHandler() {}

 HttpClientHandler.prototype.send = function(ctx, callback) {
   //fs.writeFileSync('logs/soap-request.txt', ctx.request.toString())

  request.post(
    {
      
      url: ctx.url,
      body: ctx.request,
      headers: {
        SOAPAction: ctx.action,
        'Content-Type': ctx.contentType,
        'MIME-Version': '1.0',
        ...ctx.headers,
      },
      encoding: null,
      rejectUnauthorized: false,
      agentOptions: ctx.agentOptions,
      cert: ctx.cert,
      key: ctx.key,
    },
    function(error, response, body) {
      ctx.response = body
      if (response) {
        ctx.resp_headers = response.headers
        ctx.resp_contentType = response.headers['content-type']
      }
      if (error) {
        ctx.error = error
      } else {
        ctx.statusCode = response.statusCode
        ctx.StatusMessage = response.statusMessage
      }
      callback(ctx)
    }
  )
}

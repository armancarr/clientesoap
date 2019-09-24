var select = require('./xpath').SelectNodes,
  Dom = require('xmldom').DOMParser,
  fs = require('fs'),
  utils = require('./utils'),
  xmlToObject = require('./parser').xmlToObject
exports.Http = require('./handlers/client/http.js').HttpClientHandler
exports.Addr = require('./handlers/client/addressing.js').WsAddressingClientHandler
exports.Mtom = require('./handlers/client/mtom/mtom.js').MtomClientHandler
exports.Security = require('./handlers/client/security/security.js').SecurityClientHandler
exports.UsernameToken = require('./handlers/client/security/security.js').UsernameToken
exports.X509BinarySecurityToken = require('./handlers/client/security/security.js').X509BinarySecurityToken
exports.Signature = require('./handlers/client/security/signature.js').Signature
exports.RequestLogger = require('./handlers/client/request-logger.js').RequestLoggerClientHandler

exports.send = send
exports.addAttachment = addAttachment
exports.getAttachment = getAttachment
exports.xmlToObject = xmlToObject
exports.SoapClient = require('./soapclient').SoapClient

function send(handlers, ctx, callback) {
  ensureHasSoapHeader(ctx)

  for (let i = 0; i < handlers.length - 1; i++) {
    handlers[i].next = handlers[i + 1]
  }
  handlers[0].send(ctx, function(ctx) {
    //some handlers may leave response as a buffer so we need to make sure it is string
    if (ctx.response) {
      ctx.response = ctx.response.toString()

     const cleanedString = ctx.response
        .replace(/<!--[\s\S]*?-->/, '')
        .match(
          /(?:<\?[^?]*\?>[\s]*)?<([^:]*):Envelope([\S\s]*)<\/\1:Envelope>/i
        )
      try {
        if (cleanedString) {
          ctx.response = xmlToObject(cleanedString[0])
          ctx.xmlResponse=cleanedString[0]
        }
      } catch (error) {
        throw new Error(
          'Unable to parse response: ' +
            JSON.stringify(error) +
            '\n XML: \n' +
            cleanedString[0]
        )
      }
    }
    callback(ctx)
  })
}

function ensureHasSoapHeader(ctx) {
  var doc = new Dom().parseFromString(ctx.request),
    header = select(
      doc,
      "/*[local-name(.)='Envelope']/*[local-name(.)='Header']"
    ),
    qname =
      doc.documentElement.prefix == null ? '' : doc.documentElement.prefix + ':'
  qname += 'Header'
  if (header.length == 0) {
    utils.prependElement(
      doc,
      doc.documentElement,
      doc.documentElement.namespaceURI,
      qname,
      null
    )
  }

  ctx.request = doc.toString()
}

function isArray(obj) {
  return typeof obj == 'object' && obj instanceof Array
}

function addAttachment(ctx, property, xpath, file, contentType) {
  var prop = ctx[property],
    doc = new Dom().parseFromString(prop),
    elem = select(doc, xpath)[0],
    // content = fs.readFileSync(file).toString('base64')
    content = file

  utils.setElementValue(doc, elem, content)
  ctx[property] = doc.toString()
  if (!ctx.base64Elements) {
    ctx.base64Elements = []
  }
  ctx.base64Elements.push({
    xpath: xpath,
    contentType: contentType,
    content: content,
  })
}

function getAttachment(ctx, property, xpath) {
  var prop = eval('ctx.' + property),
    doc = new Dom().parseFromString(prop),
    elem = select(doc, xpath)[0]

  return new Buffer.from(elem.firstChild.data, 'base64')
}



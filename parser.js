var sax = require('sax')
var _ = require('lodash')

exports.TNS_PREFIX = '__tns__' // Prefix for targetNamespace
var XSI_URI = 'http://www.w3.org/2001/XMLSchema-instance'

function splitQName(nsName) {
  if (typeof nsName !== 'string') {
    return {
      prefix: exports.TNS_PREFIX,
      name: nsName,
    }
  }
  var topLevelName = nsName.split('|')[0]
  var prefixOffset = topLevelName.indexOf(':')
  return {
    prefix: topLevelName.substring(0, prefixOffset) || exports.TNS_PREFIX,
    name: topLevelName.substring(prefixOffset + 1),
  }
}
exports.splitQName = splitQName

var trimLeft = /^[\s\xA0]+/
var trimRight = /[\s\xA0]+$/
function trim(text) {
  return text.replace(trimLeft, '').replace(trimRight, '')
}

function xmlToObject(xml) {
  var p = sax.parser(true, null)
  var objectName = null
  var root = {}
  var schema = {
    Envelope: {
      Header: {
        Security: {
          UsernameToken: {
            Username: 'string',
            Password: 'string',
          },
        },
      },
      Body: {
        Fault: {
          faultcode: 'string',
          faultstring: 'string',
          detail: 'string',
        },
      },
    },
  }
  var stack = [{ name: null, object: root, schema: schema }]
  var xmlns = {}
  var refs = {}
  var id // {id:{hrefs:[],obj:}, ...}
  p.onopentag = function(node) {
    var nsName = node.name
    var attrs = node.attributes
    var name = splitQName(nsName).name
    var attributeName
    var top = stack[stack.length - 1]
    var topSchema = top.schema
    var elementAttributes = {}
    var hasNonXmlnsAttribute = false
    var hasNilAttribute = false
    var obj = {}
    var originalName = name
    if (!objectName && top.name === 'Body' && name !== 'Fault') {
      // Determine if this is request or response
      var isInput = false
      var isOutput = false
      if (/Response$/.test(name)) {
        isOutput = true
        name = name.replace(/Response$/, '')
      } else if (/Request$/.test(name)) {
        isInput = true
        name = name.replace(/Request$/, '')
      } else if (/Solicit$/.test(name)) {
        isInput = true
        name = name.replace(/Solicit$/, '')
      }
      objectName = originalName
    }
    if (attrs.href) {
      id = attrs.href.substr(1)
      if (!refs[id]) {
        refs[id] = { hrefs: [], obj: null }
      }
      refs[id].hrefs.push({ par: top.object, key: name, obj: obj })
    }
    if ((id = attrs.id)) {
      if (!refs[id]) {
        refs[id] = { hrefs: [], obj: null }
      }
    }
    // Handle element attributes
    for (attributeName in attrs) {
      if (/^xmlns:|^xmlns$/.test(attributeName)) {
        xmlns[splitQName(attributeName).name] = attrs[attributeName]
        continue
      }
      hasNonXmlnsAttribute = true
      elementAttributes[attributeName] = attrs[attributeName]
    }
    for (attributeName in elementAttributes) {
      var res = splitQName(attributeName)
      if (
        res.name === 'nil' &&
        xmlns[res.prefix] === XSI_URI &&
        elementAttributes[attributeName] &&
        (elementAttributes[attributeName].toLowerCase() === 'true' ||
          elementAttributes[attributeName] === '1')
      ) {
        hasNilAttribute = true
        break
      }
    }
    if (hasNonXmlnsAttribute) {
      obj['attributes'] = elementAttributes
    }
    // Pick up the schema for the type specified in element's xsi:type attribute.
    var xsiTypeSchema
    var xsiType
    for (var prefix in xmlns) {
      if (xmlns[prefix] === XSI_URI && prefix + ':type' in elementAttributes) {
        xsiType = elementAttributes[prefix + ':type']
        break
      }
    }
    if (xsiType) {
      var type = splitQName(xsiType)
      var typeURI = void 0
      if (type.prefix === exports.TNS_PREFIX) {
        // In case of xsi:type = "MyType"
        typeURI = xmlns[type.prefix] || xmlns.xmlns
      } else {
        typeURI = xmlns[type.prefix]
      }
    }
    if (topSchema && topSchema[name + '[]']) {
      name = name + '[]'
    }
    stack.push({
      name: originalName,
      object: obj,
      schema: xsiTypeSchema || (topSchema && topSchema[name]),
      id: attrs.id,
      nil: hasNilAttribute,
    })
  }
  p.onclosetag = function(nsName) {
    var cur = stack.pop()
    var obj = cur.object
    var top = stack[stack.length - 1]
    var topObject = top.object
    var topSchema = top.schema
    var name = splitQName(nsName).name
    if (
      typeof cur.schema === 'string' &&
      (cur.schema === 'string' || cur.schema.split(':')[1] === 'string')
    ) {
      if (typeof obj === 'object' && Object.keys(obj).length === 0) {
        obj = cur.object = ''
      }
    }
    if (cur.nil === true) {
      return
    }
    if (_.isPlainObject(obj) && !Object.keys(obj).length) {
      obj = null
    }
    if (topSchema && topSchema[name + '[]']) {
      if (!topObject[name]) {
        topObject[name] = []
      }
      topObject[name].push(obj)
    } else if (name in topObject) {
      if (!Array.isArray(topObject[name])) {
        topObject[name] = [topObject[name]]
      }
      topObject[name].push(obj)
    } else {
      topObject[name] = obj
    }
    if (cur.id) {
      refs[cur.id].obj = obj
    }
  }
  p.oncdata = function(text) {
    var originalText = text
    text = trim(text)
    if (!text.length) {
      return
    }
    if (/<\?xml[\s\S]+\?>/.test(text)) {
      var top_1 = stack[stack.length - 1]
      var value = xmlToObject(text)
      if (top_1.object['attributes']) {
        top_1.object['$value'] = value
      } else {
        top_1.object = value
      }
    } else {
      p.ontext(originalText)
    }
  }
  p.onerror = function(e) {
    p.resume()
    throw {
      Fault: {
        faultcode: 500,
        faultstring: 'Invalid XML',
        detail: new Error(e).message,
        statusCode: 500,
      },
    }
  }
  p.ontext = function(text) {
    var originalText = text
    text = trim(text)
    if (!text.length) {
      return
    }
    var top = stack[stack.length - 1]
    var name = splitQName(top.schema).name
    var value

    if (name === 'int' || name === 'integer') {
      value = parseInt(text, 10)
    } else if (name === 'double' || name === 'float') {
      value = Number(text)
    } else if (name === 'bool' || name === 'boolean') {
      value = text.toLowerCase() === 'true' || text === '1'
    } else if (name === 'dateTime' || name === 'date') {
      value = new Date(text)
    } else {
      // handle string or other types
      if (typeof top.object !== 'string') {
        value = text
      } else {
        value = top.object + text
      }
    }

    if (top.object['attributes']) {
      top.object['$value'] = value
    } else {
      top.object = value
    }
  }

  p.write(xml).close()
  return finish()
  function finish() {
    // MultiRef support: merge objects instead of replacing
    for (var n in refs) {
      var ref = refs[n]
      for (var _i = 0, _a = ref.hrefs; _i < _a.length; _i++) {
        var href = _a[_i]
        _.assign(href.obj, ref.obj)
      }
    }
    if (root.Envelope) {
      var body = root.Envelope.Body
      if (body && body.Fault) {
        var code = body.Fault.faultcode && body.Fault.faultcode.$value
        var string = body.Fault.faultstring && body.Fault.faultstring.$value
        var detail = body.Fault.detail && body.Fault.detail.$value
        code = code || body.Fault.faultcode
        string = string || body.Fault.faultstring
        detail = detail || body.Fault.detail
        var error = new Error(
          code + ': ' + string + (detail ? ': ' + JSON.stringify(detail) : '')
        )
        error.root = root
       // throw error
      }
      return root.Envelope
    }
    return root
  }
}
exports.xmlToObject = xmlToObject

const send = require('./').send
const fs=require('fs')
const Http = require('./handlers/client/http.js').HttpClientHandler
const X509BinarySecurityToken = require('./handlers/client/security/security.js').X509BinarySecurityToken
const Signature = require('./handlers/client/security/signature.js').Signature
const Security = require('./handlers/client/security/security.js').SecurityClientHandler
const axios = require('axios')
const Mtom = require('./handlers/client/mtom/mtom.js').MtomClientHandler
const addAttachment = require('./').addAttachment
const DOMParser = require('xmldom').DOMParser;

class SoapClient {
    // ..and an (optional) custom class constructor. If one is
    // not supplied, a default constructor is used instead:
    // constructor() { }
    constructor(certificadoSOAP,options) {
 
        this.certificate ={
            private: fs.readFileSync(certificadoSOAP.privKey).toString(),
            public: fs.readFileSync(certificadoSOAP.pubKey).toString()
        }
        const x509 = new X509BinarySecurityToken({
          key: `${this.certificate.private}\n${this.certificate.public}`,
        })
        const signature = new Signature(x509)
        signature.addReference("//*[local-name(.)='Body']")
        signature.addReference("//*[local-name(.)='Timestamp']")
    
        this.http = new Http()
        this.security = new Security({}, [x509, signature])
        this.Mtom = new Mtom()
        this.handlers = [this.security, this.http]
        this.options=options
    }
    // Si requiere MTOM 
    setHandlers(handlers) {
        this.handlers = handlers
    }
    setRequest(request) {
      this.request = request
    }
    getHttp(){
        return this.http
    }

    getSecurity(){
        return this.security
    }
    getMtom(){
      return this.Mtom
    }
 
    call (ctx,pCtx, logger) 
    {
      return new Promise((resolve, reject) => {
        const newctx = {
            ...ctx,
          contentType: 'text/xml',
          cert: this.certificate.public,
          key: this.certificate.private,
        } 
        const shouldLog = this.options.log
        const logOperation = this.log
        const debug = this.options.debug
        const loggerEndPoint = this.options.loggerEndPoint
        const opData = {
          date: new Date().toISOString(),
          status: 'OK',
        } 
        
        send(this.handlers, newctx, (resctx) => {
          if (resctx.statusCode === 200) {
            if (debug) {
              if (logger){
                logger.debug(
                  `ClienteSoap:call:send:${
                    opData.status
                  }: Ctx=${JSON.stringify(
                    pCtx
                  )} - Request=${this.request?this.request:resctx.request} - Response=${resctx.xmlResponse}`
                )
             }
            }
            if (shouldLog) {
                // Validacion para verificar si viene el array aXpath
                if (pCtx.aXpath && Array.isArray(pCtx.aXpath)){
                  // Logica para reemplazo de cada valor que trae el array 
                  pCtx.aXpath.forEach(element => {
                    resctx.xmlResponse = this.reemplazar(element,resctx.xmlResponse, logger)
                  });
                  logOperation(pCtx, logger, opData, this.request?this.request:resctx.request, resctx.xmlResponse,ctx.serviceName,loggerEndPoint,resctx.statusCode,resctx.statusMessage).then(() => {
                    resolve(resctx.response)
                  })
                }else{
                  logOperation(pCtx, logger, opData, this.request?this.request:resctx.request, resctx.xmlResponse,ctx.serviceName,loggerEndPoint,resctx.statusCode,resctx.statusMessage).then(() => {
                    resolve(resctx.response)
                  })
                }
            } else {
              resolve(resctx.response)
            }
          } else {
            opData.status='ERROR'
            if (debug) {
              if (logger){
                logger.debug(
                  `ClienteSoap:call:send:${
                    opData.status
                  }: Ctx=${JSON.stringify(
                    pCtx
                  )} - Request=${this.request?this.request:resctx.request} - Response=${resctx.xmlResponse}`
                )
             }
            }
            if (shouldLog) {
              
              logOperation(pCtx, logger, opData, this.request?this.request:resctx.request, resctx.xmlResponse,ctx.serviceName,loggerEndPoint,resctx.statusCode,resctx.statusMessage).then(() => {
                reject(resctx.response)
              })
            } else {
              reject(resctx.response)
            }
          }
        })
      })
    }
    async log(
      ctx,
      logger,
      op,
      req,
      res,
      serviceName,
      loggerEP,
      statusCode,
      statusMessage
    ){
      const logRequest={
        consumer: {
             appConsumer: {
                 canalId:ctx.appConsumer.canalId,
                 id: ctx.appConsumer.id,
                 sessionId: ctx.appConsumer.sessionId, 
                 terminalId: ctx.appConsumer.terminalId,
                 transactionId: ctx.appConsumer.transaccionId 
            },
             deviceConsumer: {
              id: ctx.deviceConsumer.id,
              inactiveInterval:ctx.deviceConsumer.inactiveInterval,
              ip: ctx.ipAddress,
              locale: ctx.deviceConsumer.locale,
              sessionTimeout:ctx.deviceConsumer.sessionTimeout,
              userAgent: ctx.deviceConsumer.userAgent,
            },
        },
        documento: {
          numero: ctx.documento.numero,
          tipo: ctx.documento.tipo,
        },
        messages: {
          idService: serviceName, 
          requestService: req, 
          responseService: res || 'SIN-DATOS',          
        },
        operation: {
          operationDate: op.date,
          statusResponse: {
            status: op.status,
            errorDescription:statusMessage,
            httpError:statusCode,
          },
          type: ctx.type,
        },
    }
      try {
        await axios.post(loggerEP, logRequest)
      } catch (error) {
        logger.error(`ClienteSoap:call:logger error: ${error.message}`)
      }
    }

    addAttach (ctx, property, xpath, file, contentType){
      return new Promise((resolve,reject)=> {
        try{
        addAttachment(ctx,property,xpath,file,contentType)
        resolve()
      }catch(error){
        reject(error)
      }  
      })
    }

    reemplazar(aXpath, xmlResponse, logger){
      try{
        var parser = new DOMParser();
        const newXml = parser.parseFromString(xmlResponse, 'text/xml');
        const tagToReplace = newXml.getElementsByTagName(aXpath.tag)[aXpath.occurrence]
        if(tagToReplace === undefined || tagToReplace === null){return xmlResponse} 
        const valueTag = newXml.createTextNode(aXpath.value);
        tagToReplace.replaceChild(valueTag, tagToReplace.childNodes[0])
        
        return newXml.toString()
        
      }catch(error){
        logger.error(error)
      }     
    
    }
  }
exports.SoapClient=SoapClient
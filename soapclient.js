const send = require('./').send
const fs=require('fs')
const Http = require('./handlers/client/http.js').HttpClientHandler
const X509BinarySecurityToken = require('./handlers/client/security/security.js').X509BinarySecurityToken
const Signature = require('./handlers/client/security/signature.js').Signature
const Security = require('./handlers/client/security/security.js').SecurityClientHandler
const axios = require('axios')
const Mtom = require('./handlers/client/mtom/mtom.js').MtomClientHandler

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
              logOperation(pCtx, logger, opData, this.request?this.request:resctx.request, resctx.xmlResponse,ctx.serviceName,loggerEndPoint,resctx.statusCode).then(() => {
                resolve(resctx.response)
              })
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
              
              logOperation(pCtx, logger, opData, this.request?this.request:resctx.request, resctx.xmlResponse,ctx.serviceName,loggerEndPoint,resctx.statusCode).then(() => {
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
      statusCode
    ){
      const logRequest={
         consumer: {
             appConsumer: {
                 id: ctx.appConsumer.id,
                 session_id: ctx.appConsumer.sessionId,
                 transaction_id: ctx.appConsumer.transaccionId
            },
             deviceConsumer: {
              id: ctx.deviceConsumer.id,
              ip: ctx.ipAddress,
              locale: ctx.deviceConsumer.locale,
              terminalId: ctx.appConsumer.terminalId,
              userAgent: ctx.deviceConsumer.userAgent,
            },
        },
        documento: {
          numero: ctx.documento.numero,
          tipo: ctx.documento.tipo,
        },
         messages: {
           services:serviceName,
           serviceDetails:{
            idService: serviceName,
            requestService: req,
            responseService: res || 'SIN-DATOS',          
          }
        },
         operation: {
             type: ctx.type,
             code: '', // TODO: validar que viene en este campo
             operationDate: op.date, 
             sourceReference: {
                 type: "SERVICE",
                 Product: {
                     type: "",// TODO: validar que viene en este campo
                     numer: "",// TODO: validar que viene en este campo
                     state: "",// TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                     detailsProduct: { // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                         details: "",
                         detail_item: "",
                         name: "",
                         value: ""
                    },
                     balancesProduct: {// TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                         balances: "",
                         balance_item: "",
                         name: "",
                         value: {
                          currencyCode:"",
                          amount:""
                        }
                    }
                },
                service:{}
            },
             destinationReference: {// TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
               type: "",
               Transfer:{
                 Product:{
                   type:"",
                   numer:"",
                   state:"", // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                   detailsProduct:{ // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                     details:"",
                     detail_item:"",
                     name:"",
                     value:""
                  },
                   balancesProduct:{ // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                     balances:"", 
                     balance_item:"",
                     name:"",
                     value:{ // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                      currencyCode:"",
                      amount:"",
                    },
                 transferProperties:"", // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                 transferProperty:{ // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                  name:"", // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                  value:"", // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                  format:"" // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                },
                 Payment:{ // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                   type:"",
                   product_payment:"",
                   Product:{
                      type:"",
                      numer:"",
                      state:"",
                      detailsProduct:{// TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                        details:"",
                        detail_item:"",
                        name:"",
                        value:""
                      },
                    balancesProduct:{
                      balances:"",
                      balance_item:"",
                      name:"",
                      value:{
                        currencyCode:"",
                        amount:""
                      }
                  },
                   Product_payment_properties:[{ // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                   Product_payment_property:{ // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                    name:"", // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                    value:"",
                    format:"",
                   }
                   }],
                    Convenio_payment:{ // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                      Code:"",
                      Payment_references:"",
                      reference:"",
                      convenioPaymentProperties:{ // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
                        name:"",
                        value:"",
                        format:""
                    }
                  }
                }
                  }
                  },
                   amount:{
                     currencyCode:"",
                     amount:""
                  }
                }
              }
          },
           status_response:{
           status: op.status,
           approval_number:"", // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
           error:"", // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
           Error_code:"", // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
           Error_http:statusCode, 
           error_description:"" // TODO: no se tiene, enviar vacio, mientras se decide valor a enviar
          }
        }
    }
      try {
        await axios.post(loggerEP, logRequest)
      } catch (error) {
        logger.error(`ClienteSoap:call:logger error: ${error.message}`)
      }
    }
  }
exports.SoapClient=SoapClient
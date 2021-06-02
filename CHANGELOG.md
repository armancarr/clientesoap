# Changelog


## [1.0.18] - 2021-06-02

### Added

- se agrega libreria xml-encryption para xml cifrados
- se agrega atributo 'isEncrypted' como bandera de xml cifrados
- se agrega atributo 'keyEncrypted' donde viaja el path de la llave privada
- se agrega funcion 'decryption' para desencriptar el xml cifrado


## [1.0.17] - 2021-04-05

### Added

- se agrega atributo 'contentType' para parametrizar el tipo de contenido

## [1.0.16] - 2021-02-03

### None

- log para identificar ENOENT de microservicios


## [1.0.15] - 2020-12-18

### Fixed

- se agrega atributo 'bodyData' para setRequest - cuando viaja multiples peticiones al tiempo


## [1.0.14] - 2020-08-03

### Fixed

- se agrega catch de excepciones no controladas

## [1.0.13] - 2020-07-28

### Added

- se agrega función 'setCertificate' para remplazar el certificado con el que se firma las peticiones de manera dinamica



## [1.0.12] - 2020-07-07

### Fixed

- se agrega log para errores en la respuesta de petición Soap


## [1.0.11] - 2020-05-21

### Added

- se agrega header para enviar en petición soap


## [1.0.10] - 2020-04-27

### Fixed

- Fix del metodo remplazar: se hace ajuste sobre replaceChild

## [1.0.9] - 2020-04-24

### Added

- Se agrega funcion 'remplazar', para remplazar un valor determinado en la respuesta xml del servicio Soap


## [1.0.8] - 2020-03-16

### Fixed

- Se ajusta MTOM para duplicidad namespace


## [1.0.7] - 2020-03-12

### Added

- Se agrega funciones 'addAttachment' y 'getMtom' para soporte funcionalidad MTOM


## [1.0.6] - 2020-01-31

### Removed  

- Se elimina funcionalidad logger operacional de CAM, se establece log estandar


## [1.0.5] - 2020-01-15

### Added

- Log operacional CAM


## [1.0.4] - 2019-09-30

### Fixed

- Se agrega dependecias de Xpath


## [1.0.3] - 2019-09-25

### Added

- Se agrega dependecias de formidable


## [1.0.2] - 2019-09-25

### Added 

- Se agrega xmldom y xml-crypto


## [1.0.0] - 2019-09-24

### Added

- commit inicial

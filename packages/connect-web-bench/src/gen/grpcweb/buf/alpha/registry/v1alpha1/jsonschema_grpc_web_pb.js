/**
 * @fileoverview gRPC-Web generated client stub for buf.alpha.registry.v1alpha1
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!


/* eslint-disable */
// @ts-nocheck



const grpc = {};
grpc.web = require('grpc-web');

const proto = {};
proto.buf = {};
proto.buf.alpha = {};
proto.buf.alpha.registry = {};
proto.buf.alpha.registry.v1alpha1 = require('./jsonschema_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?grpc.web.ClientOptions} options
 * @constructor
 * @struct
 * @final
 */
proto.buf.alpha.registry.v1alpha1.JSONSchemaServiceClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options.format = 'binary';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname;

};


/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?grpc.web.ClientOptions} options
 * @constructor
 * @struct
 * @final
 */
proto.buf.alpha.registry.v1alpha1.JSONSchemaServicePromiseClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options.format = 'binary';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname;

};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.buf.alpha.registry.v1alpha1.GetJSONSchemaRequest,
 *   !proto.buf.alpha.registry.v1alpha1.GetJSONSchemaResponse>}
 */
const methodDescriptor_JSONSchemaService_GetJSONSchema = new grpc.web.MethodDescriptor(
  '/buf.alpha.registry.v1alpha1.JSONSchemaService/GetJSONSchema',
  grpc.web.MethodType.UNARY,
  proto.buf.alpha.registry.v1alpha1.GetJSONSchemaRequest,
  proto.buf.alpha.registry.v1alpha1.GetJSONSchemaResponse,
  /**
   * @param {!proto.buf.alpha.registry.v1alpha1.GetJSONSchemaRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.buf.alpha.registry.v1alpha1.GetJSONSchemaResponse.deserializeBinary
);


/**
 * @param {!proto.buf.alpha.registry.v1alpha1.GetJSONSchemaRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.buf.alpha.registry.v1alpha1.GetJSONSchemaResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.buf.alpha.registry.v1alpha1.GetJSONSchemaResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.buf.alpha.registry.v1alpha1.JSONSchemaServiceClient.prototype.getJSONSchema =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/buf.alpha.registry.v1alpha1.JSONSchemaService/GetJSONSchema',
      request,
      metadata || {},
      methodDescriptor_JSONSchemaService_GetJSONSchema,
      callback);
};


/**
 * @param {!proto.buf.alpha.registry.v1alpha1.GetJSONSchemaRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.buf.alpha.registry.v1alpha1.GetJSONSchemaResponse>}
 *     Promise that resolves to the response
 */
proto.buf.alpha.registry.v1alpha1.JSONSchemaServicePromiseClient.prototype.getJSONSchema =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/buf.alpha.registry.v1alpha1.JSONSchemaService/GetJSONSchema',
      request,
      metadata || {},
      methodDescriptor_JSONSchemaService_GetJSONSchema);
};


module.exports = proto.buf.alpha.registry.v1alpha1;

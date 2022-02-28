/* eslint-disable */
// @generated by protoc-gen-es v0.0.1 with parameter "ts_nocheck=false"
// @generated from file extra/msg-json-names.proto (package spec, syntax proto3)

import type {BinaryReadOptions, FieldList, JsonReadOptions, JsonValue, PartialMessage, PlainMessage} from "@bufbuild/protobuf";
import {Message, proto3} from "@bufbuild/protobuf";

/**
 * @generated from message spec.JsonNamesMessage
 */
export class JsonNamesMessage extends Message<JsonNamesMessage> {

    /**
     * @generated from field: string scalar_field = 1 [json_name = "scalarFieldJsonName"];
     */
    scalarField = "";

    /**
     * @generated from field: repeated string repeated_scalar_field = 2 [json_name = "repeatedScalarFieldJsonName"];
     */
    repeatedScalarField: string[] = [];

    /**
     * @generated from field: string a = 3 [json_name = "sameJsonName"];
     */
    a = "";

    /**
     * @generated from field: string b = 4 [json_name = "sameJsonName"];
     */
    b = "";

    /**
     * @generated from field: string c = 5;
     */
    c = "";

    /**
     * @generated from field: string d = 6 [json_name = "c"];
     */
    d = "";

    /**
     * @generated from field: string e = 7;
     */
    e = "";

    constructor(data?: PartialMessage<JsonNamesMessage>) {
        super();
        proto3.util.initPartial(data, this);
    }

    static readonly runtime = proto3;
    static readonly typeName = "spec.JsonNamesMessage";
    static readonly fields: FieldList = proto3.util.newFieldList(() => [
        {no: 1, name: "scalar_field", jsonName: "scalarFieldJsonName", kind: "scalar", T: 9 /* ScalarType.STRING */},
        {no: 2, name: "repeated_scalar_field", jsonName: "repeatedScalarFieldJsonName", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true},
        {no: 3, name: "a", jsonName: "sameJsonName", kind: "scalar", T: 9 /* ScalarType.STRING */},
        {no: 4, name: "b", jsonName: "sameJsonName", kind: "scalar", T: 9 /* ScalarType.STRING */},
        {no: 5, name: "c", kind: "scalar", T: 9 /* ScalarType.STRING */},
        {no: 6, name: "d", jsonName: "c", kind: "scalar", T: 9 /* ScalarType.STRING */},
        {no: 7, name: "e", kind: "scalar", T: 9 /* ScalarType.STRING */},
    ]);

    static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): JsonNamesMessage {
        return new JsonNamesMessage().fromBinary(bytes, options);
    }

    static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): JsonNamesMessage {
        return new JsonNamesMessage().fromJson(jsonValue, options);
    }

    static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): JsonNamesMessage {
        return new JsonNamesMessage().fromJsonString(jsonString, options);
    }

    static equals(a: JsonNamesMessage | PlainMessage<JsonNamesMessage> | undefined, b: JsonNamesMessage | PlainMessage<JsonNamesMessage> | undefined): boolean {
        return proto3.util.equals(JsonNamesMessage, a, b);
    }

}


/* eslint-disable */
// @generated by protoc-gen-connectweb v0.0.1 with parameter "ts_nocheck=false"
// @generated from file google/protobuf/unittest_no_generic_services.proto (package protobuf_unittest.no_generic_services_test, syntax proto2)

import {TestMessage} from "./unittest_no_generic_services_pb.js";
import {MethodKind} from "@bufbuild/protobuf";

// ## Service TestService
// Generated from service protobuf_unittest.no_generic_services_test.TestService
export const TestService = {
    typeName: "protobuf_unittest.no_generic_services_test.TestService",
    methods: {
        foo: {
            name: "Foo",
            I: TestMessage,
            O: TestMessage,
            kind: MethodKind.Unary,
        },
    }
} as const;

// Copyright 2021-2023 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  Code,
  codeToString,
  ConnectError,
  connectErrorDetails,
  connectErrorFromJson,
  connectErrorFromReason,
} from "@bufbuild/connect-web";
import {
  Any,
  BoolValue,
  createRegistry,
  protoBase64,
  Struct,
} from "@bufbuild/protobuf";
import { ErrorDetail } from "./gen/grpc/testing/messages_pb.js";

// TODO remove this file after connect-web has migrated to connect-core

describe("ConnectError", () => {
  describe("constructor", () => {
    it("should have status unknown by default", () => {
      const e = new ConnectError("foo");
      expect(e.code).toBe(Code.Unknown);
      expect(e.message).toBe("[unknown] foo");
      expect(e.rawMessage).toBe("foo");
      expect(String(e)).toBe("ConnectError: [unknown] foo");
    });
    it("should take other status", () => {
      const e = new ConnectError("foo", Code.AlreadyExists);
      expect(e.code).toBe(Code.AlreadyExists);
      expect(e.message).toBe("[already_exists] foo");
      expect(e.rawMessage).toBe("foo");
      expect(String(e)).toBe("ConnectError: [already_exists] foo");
    });
    it("accepts metadata", () => {
      const e = new ConnectError("foo", Code.AlreadyExists, { foo: "bar" });
      expect(e.metadata.get("foo")).toBe("bar");
    });
  });
});

describe("connectErrorDetails()", () => {
  describe("on error without details", () => {
    const err = new ConnectError("foo");
    it("with empty TypeRegistry produces no details", () => {
      const details = connectErrorDetails(err, createRegistry());
      expect(details.length).toBe(0);
    });
    it("with non-empty TypeRegistry produces no details", () => {
      const details = connectErrorDetails(err, createRegistry(ErrorDetail));
      expect(details.length).toBe(0);
    });
    it("with MessageType produces no details", () => {
      const details = connectErrorDetails(err, ErrorDetail);
      expect(details.length).toBe(0);
    });
  });
  describe("on error with Any details", () => {
    const err = new ConnectError("foo");
    err.details.push(
      Any.pack(
        new ErrorDetail({
          reason: "soirée 🎉",
          domain: "example.com",
        })
      )
    );
    it("with empty TypeRegistry produces no details", () => {
      const details = connectErrorDetails(err, createRegistry());
      expect(details.length).toBe(0);
    });
    it("with non-empty TypeRegistry produces detail", () => {
      const details = connectErrorDetails(err, createRegistry(ErrorDetail));
      expect(details.length).toBe(1);
    });
    it("with MessageType produces detail", () => {
      const details = connectErrorDetails(err, ErrorDetail);
      expect(details.length).toBe(1);
      if (details[0] instanceof ErrorDetail) {
        expect(details[0].domain).toBe("example.com");
        expect(details[0].reason).toBe("soirée 🎉");
      } else {
        fail();
      }
    });
    it("with multiple MessageTypes produces detail", () => {
      const details = connectErrorDetails(err, Struct, ErrorDetail, BoolValue);
      expect(details.length).toBe(1);
      expect(details[0]).toBeInstanceOf(ErrorDetail);
    });
  });
});

describe("connectErrorFromReason()", () => {
  it("accepts ConnectError as unknown", () => {
    const error: unknown = new ConnectError(
      "Not permitted",
      Code.PermissionDenied
    );
    const got = connectErrorFromReason(error);
    expect(got as unknown).toBe(error);
    expect(got.code).toBe(Code.PermissionDenied);
    expect(got.rawMessage).toBe("Not permitted");
  });
  it("accepts any Error", () => {
    const error: unknown = new Error("Not permitted");
    const got = connectErrorFromReason(error);
    expect(got as unknown).not.toBe(error);
    expect(got.code).toBe(Code.Unknown);
    expect(got.rawMessage).toBe("Not permitted");
  });
  it("accepts string value", () => {
    const error: unknown = "Not permitted";
    const got = connectErrorFromReason(error);
    expect(got.code).toBe(Code.Unknown);
    expect(got.rawMessage).toBe("Not permitted");
  });
});

describe("connectErrorFromJson()", () => {
  it("parses code and message", () => {
    const error = connectErrorFromJson({
      code: "permission_denied",
      message: "Not permitted",
    });
    expect(error.code).toBe(Code.PermissionDenied);
    expect(error.rawMessage).toBe("Not permitted");
    expect(error.details.length).toBe(0);
  });
  it("does not require message", () => {
    const error = connectErrorFromJson({
      code: codeToString(Code.PermissionDenied),
    });
    expect(error.message).toBe("[permission_denied]");
    expect(error.rawMessage).toBe("");
  });
  it("with invalid code throws", () => {
    expect(() =>
      connectErrorFromJson({
        code: "wrong code",
        message: "Not permitted",
      })
    ).toThrowError(
      '[internal] cannot decode ConnectError.code from JSON: "wrong code"'
    );
  });
  it("with code Ok throws", () => {
    expect(() =>
      connectErrorFromJson({
        code: "ok",
        message: "Not permitted",
      })
    ).toThrowError(
      '[internal] cannot decode ConnectError.code from JSON: "ok"'
    );
  });
  it("with missing code throws", () => {
    expect(() =>
      connectErrorFromJson({
        message: "Not permitted",
      })
    ).toThrowError("[internal] cannot decode ConnectError from JSON: object");
  });
  describe("with details", () => {
    const json = {
      code: "permission_denied",
      message: "Not permitted",
      details: [
        {
          type: "grpc.testing.ErrorDetail",
          value: protoBase64.enc(
            new ErrorDetail({
              reason: "soirée 🎉",
              domain: "example.com",
            }).toBinary()
          ),
        },
      ],
    };
    it("adds to raw detail", () => {
      const error = connectErrorFromJson(json);
      expect(error.details.length).toBe(1);
      expect(error.details[0]?.typeUrl).toBe(
        "type.googleapis.com/grpc.testing.ErrorDetail"
      );
    });
    it("works with connectErrorDetails()", () => {
      const error = connectErrorFromJson(json);
      const details = connectErrorDetails(error, ErrorDetail);
      expect(details.length).toBe(1);
      expect(details[0]?.reason).toBe("soirée 🎉");
      expect(details[0]?.domain).toBe("example.com");
    });
  });
});

describe("assertConnectError() example", () => {
  /**
   * Asserts that the given reason is a ConnectError.
   * If the reason is not a ConnectError, or does not
   * have the wanted Code, rethrow it.
   */
  function assertConnectError(
    reason: unknown,
    ...codes: Code[]
  ): asserts reason is ConnectError {
    if (reason instanceof ConnectError) {
      if (codes.length === 0) {
        return;
      }
      if (codes.includes(reason.code)) {
        return;
      }
    }
    // reason is not a ConnectError, or does
    // not have the wanted Code - rethrow it.
    throw reason;
  }
  it("asserts ConnectError", () => {
    const err: unknown = new ConnectError("foo");
    assertConnectError(err);
    expect(err.rawMessage).toBe("foo");
  });
  it("asserts ConnectError with Code", () => {
    const err: unknown = new ConnectError("foo", Code.PermissionDenied);
    assertConnectError(err, Code.PermissionDenied);
    expect(err.code).toBe(Code.PermissionDenied);
    expect(err.rawMessage).toBe("foo");
  });
  it("rethrows non-ConnectErrors", () => {
    expect(() => assertConnectError(true)).toThrow(true);
  });
  it("rethrows ConnectError with unwanted Code", () => {
    const err: unknown = new ConnectError("foo", Code.PermissionDenied);
    expect(() => assertConnectError(err, Code.InvalidArgument)).toThrow(err);
  });
});

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
  ConnectError,
  createCallbackClient,
  createPromiseClient,
  Code,
} from "@bufbuild/connect-web";
import { UnimplementedService } from "../gen/grpc/testing/test_connectweb.js";
import { describeLegacyTransports } from "../helpers/legacy-crosstestserver.js";

describe("unimplemented_service", function () {
  function expectError(err: unknown) {
    // We expect this to be DEADLINE_EXCEEDED, however envoy is monitoring the stream timeout
    // and will return an HTTP status code 408 when stream max duration time reached, which
    // cannot be translated to a connect error code.
    expect(err).toBeInstanceOf(ConnectError);
    if (err instanceof ConnectError) {
      expect(err.code === Code.DeadlineExceeded);
    }
  }

  describeLegacyTransports((transport) => {
    it("with promise client", async function () {
      const client = createPromiseClient(UnimplementedService, transport());
      try {
        await client.unimplementedCall({});
        fail("expected to catch an error");
      } catch (e) {
        expectError(e);
      }
    });
    it("with callback client", function (done) {
      const client = createCallbackClient(UnimplementedService, transport());
      client.unimplementedCall({}, (err: ConnectError | undefined) => {
        expectError(err);
        done();
      });
    });
  });
});

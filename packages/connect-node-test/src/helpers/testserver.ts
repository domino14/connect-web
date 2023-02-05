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

import * as http2 from "http2";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import {
  compressionGzip,
  createConnectTransport,
  createGrpcTransport,
  createGrpcWebTransport,
  createHandlers,
  mergeHandlers,
  Transport,
} from "@bufbuild/connect-node";
import { TestService } from "../gen/grpc/testing/test_connectweb.js";
import { testService } from "./test-service-impl.js";

export function createTestServers() {
  // TODO http2 server with TLS and allow http1
  let nodeH2SecureServer: http2.Http2SecureServer | undefined;
  let nodeH2cServer: http2.Http2Server | undefined;
  let nodeHttpServer: http.Server | undefined;
  let nodeHttpsServer: http.Server | undefined;

  const certLocalhost = getCertLocalhost();

  // The following servers are available through crosstests:
  //
  // | server        | port |
  // | ------------- | --- |
  // | connect-go h1 | 8080 |
  // | connect-go h2 | 8081 |
  // | grpc-go       | 8083 |
  //
  // Source: https://github.com/bufbuild/connect-web/pull/87
  const servers = {
    "connect-go (h1)": {
      getUrl() {
        return `https://localhost:8080`;
      },
      start() {
        return Promise.resolve();
      },
      stop() {
        return Promise.resolve();
      },
    },
    "connect-go (h2)": {
      getUrl() {
        return `https://localhost:8081`;
      },
      start() {
        return Promise.resolve();
      },
      stop() {
        return Promise.resolve();
      },
    },
    "grpc-go (h2)": {
      getUrl() {
        return `https://localhost:8083`;
      },
      start() {
        return Promise.resolve();
      },
      stop() {
        return Promise.resolve();
      },
    },
    "@bufbuild/connect-node (h2)": {
      getUrl() {
        const address = nodeH2SecureServer?.address();
        if (address == null || typeof address == "string") {
          throw new Error("cannot get server port");
        }
        return `https://localhost:${address.port}`;
      },
      start() {
        return new Promise<void>((resolve) => {
          nodeH2SecureServer = http2
            .createSecureServer(
              {
                allowHTTP1: true,
                cert: certLocalhost.cert,
                key: certLocalhost.key,
              },
              mergeHandlers(createHandlers(TestService, testService, {}))
            )
            .listen(0, resolve);
        });
      },
      stop() {
        return new Promise<void>((resolve, reject) => {
          if (!nodeH2SecureServer) {
            reject(new Error("http2Server not started"));
            return;
          }
          nodeH2SecureServer.close((err) => (err ? reject(err) : resolve()));
          // TODO this resolve is only there because we currently don't manage http2 sessions in the client, and the server doesn't shut down with an open connection
          resolve(); // the server.close() callback above slows down our tests
        });
      },
    },
    "@bufbuild/connect-node (h2c)": {
      getUrl() {
        const address = nodeH2cServer?.address();
        if (address == null || typeof address == "string") {
          throw new Error("cannot get server port");
        }
        return `http://localhost:${address.port}`;
      },
      start() {
        return new Promise<void>((resolve) => {
          nodeH2cServer = http2
            .createServer(
              {},
              mergeHandlers(createHandlers(TestService, testService, {}))
            )
            .listen(0, resolve);
        });
      },
      stop() {
        return new Promise<void>((resolve, reject) => {
          if (!nodeH2cServer) {
            reject(new Error("http2Server not started"));
            return;
          }
          nodeH2cServer.close((err) => (err ? reject(err) : resolve()));
          // TODO this resolve is only there because we currently don't manage http2 sessions in the client, and the server doesn't shut down with an open connection
          resolve(); // the server.close() callback above slows down our tests
        });
      },
    },
    "@bufbuild/connect-node (h1)": {
      getUrl() {
        const address = nodeHttpServer?.address();
        if (address == null || typeof address == "string") {
          throw new Error("cannot get server port");
        }
        return `http://127.0.0.1:${address.port}`;
      },
      start(port = 0) {
        return new Promise<void>((resolve) => {
          const corsAllowHeaders = [
            "Content-Type",
            // gRPC-web
            "X-User-Agent",
            "X-Grpc-Web",
            "Grpc-Timeout",
            // Connect
            "Connect-Protocol-Version",
            "Connect-Timeout-Ms",
            // used in tests
            "X-Grpc-Test-Echo-Initial",
            "X-Grpc-Test-Echo-Trailing-Bin",
          ];
          const corsExposeHeaders = [
            // gRPC-web
            "Grpc-Status",
            "Grpc-Message",
            // used in tests
            "Grpc-Status-Details-Bin", // error details
            "X-Grpc-Test-Echo-Initial",
            "X-Grpc-Test-Echo-Trailing-Bin",
            "Trailer-X-Grpc-Test-Echo-Trailing-Bin", // unary trailer in Connect
          ];
          const corsHeaders = {
            "Access-Control-Allow-Origin": "*", // caution with this
            "Access-Control-Allow-Methods": "OPTIONS, POST",
            "Access-Control-Allow-Headers": corsAllowHeaders.join(", "),
            "Access-Control-Expose-Headers": corsExposeHeaders.join(", "),
            "Access-Control-Max-Age": 2 * 3600,
          };
          const serviceHandler = mergeHandlers(
            createHandlers(TestService, testService, {})
          );
          nodeHttpServer = http
            .createServer({}, (req, res) => {
              if (req.method === "OPTIONS") {
                res.writeHead(204, corsHeaders);
                res.end();
                return;
              }
              for (const [k, v] of Object.entries(corsHeaders)) {
                res.setHeader(k, v);
              }
              serviceHandler(req, res);
            })
            .listen(port, resolve);
        });
      },
      stop() {
        return new Promise<void>((resolve, reject) => {
          if (!nodeHttpServer) {
            reject(new Error("httpServer not started"));
            return;
          }
          nodeHttpServer.close((err) => (err ? reject(err) : resolve()));
        });
      },
    },

    "@bufbuild/connect-node (h1 + tls)": {
      getUrl() {
        const address = nodeHttpsServer?.address();
        if (address == null || typeof address == "string") {
          throw new Error("cannot get server port");
        }
        return `https://localhost:${address.port}`;
      },
      start() {
        return new Promise<void>((resolve) => {
          nodeHttpsServer = https
            .createServer(
              {
                cert: certLocalhost.cert,
                key: certLocalhost.key,
              },
              mergeHandlers(createHandlers(TestService, testService, {}))
            )
            .listen(0, resolve);
        });
      },
      stop() {
        return new Promise<void>((resolve, reject) => {
          if (!nodeHttpsServer) {
            reject(new Error("https not started"));
            return;
          }
          nodeHttpsServer.close((err) => (err ? reject(err) : resolve()));
          resolve(); // the server.close() callback above slows down our tests
        });
      },
    },
  };

  const transports = {
    // TODO add http1.1 transports once implemented
    // gRPC
    "@bufbuild/connect-node (gRPC, binary, http2) against @bufbuild/connect-node (h2)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h2)"].getUrl(),
          httpVersion: "2",
          nodeOptions: {
            ca: certLocalhost.cert,
          },
          useBinaryFormat: true,
        }),
    "@bufbuild/connect-node (gRPC, binary, http2) against @bufbuild/connect-node (h2c)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h2c)"].getUrl(),
          httpVersion: "2",
          useBinaryFormat: true,
        }),
    "@bufbuild/connect-node (gRPC, JSON, http2) against @bufbuild/connect-node (h2c)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h2c)"].getUrl(),
          httpVersion: "2",
          useBinaryFormat: false,
        }),
    "@bufbuild/connect-node (gRPC, binary, http2, gzip) against @bufbuild/connect-node (h2c)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h2c)"].getUrl(),
          httpVersion: "2",
          useBinaryFormat: true,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (gRPC, JSON, http2, gzip) against @bufbuild/connect-node (h2c)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h2c)"].getUrl(),
          httpVersion: "2",
          useBinaryFormat: false,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (gRPC, binary, http2) against connect-go (h1)": (
      options?: Record<string, unknown>
    ) =>
      createGrpcTransport({
        ...options,
        baseUrl: servers["connect-go (h1)"].getUrl(),
        httpVersion: "2",
        nodeOptions: {
          rejectUnauthorized: false, // TODO set up cert for go server correctly
        },
        useBinaryFormat: true,
      }),
    "@bufbuild/connect-node (gRPC, binary, http2, gzip) against connect-go (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["connect-go (h1)"].getUrl(),
          httpVersion: "2",
          nodeOptions: {
            rejectUnauthorized: false, // TODO set up cert for go server correctly
          },
          useBinaryFormat: true,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (gRPC, JSON, http2, gzip) against connect-go (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["connect-go (h1)"].getUrl(),
          httpVersion: "2",
          nodeOptions: {
            rejectUnauthorized: false, // TODO set up cert for go server correctly
          },
          useBinaryFormat: false,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (gRPC, JSON, http2) against connect-go (h1)": (
      options?: Record<string, unknown>
    ) =>
      createGrpcTransport({
        ...options,
        baseUrl: servers["connect-go (h1)"].getUrl(),
        httpVersion: "2",
        nodeOptions: {
          rejectUnauthorized: false, // TODO set up cert for go server correctly
        },
        useBinaryFormat: false,
      }),
    "@bufbuild/connect-node (gRPC, binary, http2) against grpc-go (h2)": (
      options?: Record<string, unknown>
    ) =>
      createGrpcTransport({
        ...options,
        baseUrl: servers["grpc-go (h2)"].getUrl(),
        httpVersion: "2",
        nodeOptions: {
          rejectUnauthorized: false, // TODO set up cert for go server correctly
        },
        useBinaryFormat: true,
      }),
    "@bufbuild/connect-node (gRPC, binary, http) against @bufbuild/connect-node (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: true,
        }),
    "@bufbuild/connect-node (gRPC, JSON, http) against @bufbuild/connect-node (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: false,
        }),
    "@bufbuild/connect-node (gRPC, JSON, https) against @bufbuild/connect-node (h1 + tls)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1 + tls)"].getUrl(),
          httpVersion: "1.1",
          nodeOptions: {
            rejectUnauthorized: false,
          },
          useBinaryFormat: false,
        }),
    "@bufbuild/connect-node (gRPC, binary, https) against @bufbuild/connect-node (h1 + tls)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1 + tls)"].getUrl(),
          httpVersion: "1.1",
          nodeOptions: {
            rejectUnauthorized: false,
          },
          useBinaryFormat: true,
        }),
    "@bufbuild/connect-node (gRPC, binary, https) against connect-go (h1)": (
      options?: Record<string, unknown>
    ) =>
      createGrpcTransport({
        ...options,
        baseUrl: servers["connect-go (h1)"].getUrl(),
        httpVersion: "1.1",
        nodeOptions: {
          rejectUnauthorized: false,
        },
        useBinaryFormat: true,
      }),
    "@bufbuild/connect-node (gRPC, JSON, https) against connect-go (h1)": (
      options?: Record<string, unknown>
    ) =>
      createGrpcTransport({
        ...options,
        baseUrl: servers["connect-go (h1)"].getUrl(),
        httpVersion: "1.1",
        nodeOptions: {
          rejectUnauthorized: false,
        },
        useBinaryFormat: false,
      }),
    "@bufbuild/connect-node (gRPC, binary, http, gzip) against connect-go (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["connect-go (h1)"].getUrl(),
          httpVersion: "1.1",
          nodeOptions: {
            rejectUnauthorized: false,
          },
          useBinaryFormat: true,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (gRPC, JSON, http, gzip) against connect-go (h1)": (
      options?: Record<string, unknown>
    ) =>
      createGrpcTransport({
        ...options,
        baseUrl: servers["connect-go (h1)"].getUrl(),
        useBinaryFormat: false,
        sendCompression: compressionGzip,
        httpVersion: "1.1",
        nodeOptions: {
          rejectUnauthorized: false,
        },
      }),
    "@bufbuild/connect-node (gRPC, binary, http, gzip) against @bufbuild/connect-node (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: true,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (gRPC, JSON, http, gzip) against @bufbuild/connect-node (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: false,
          sendCompression: compressionGzip,
        }),
    // Connect
    "@bufbuild/connect-node (Connect, binary, http2, gzip) against @bufbuild/connect-node (h2c)":
      (options?: Record<string, unknown>) =>
        createConnectTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h2c)"].getUrl(),
          httpVersion: "2",
          useBinaryFormat: true,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (Connect, binary, http2, gzip) against connect-go (h1)":
      (options?: Record<string, unknown>) =>
        createConnectTransport({
          ...options,
          baseUrl: servers["connect-go (h1)"].getUrl(),
          httpVersion: "2",
          nodeOptions: {
            rejectUnauthorized: false, // TODO set up cert for go server correctly
          },
          useBinaryFormat: true,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (Connect, JSON, http2, gzip) against @bufbuild/connect-node (h2c)":
      (options?: Record<string, unknown>) =>
        createConnectTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h2c)"].getUrl(),
          httpVersion: "2",
          useBinaryFormat: false,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (Connect, JSON, http2, gzip) against connect-go (h1)":
      (options?: Record<string, unknown>) =>
        createConnectTransport({
          ...options,
          baseUrl: servers["connect-go (h1)"].getUrl(),
          httpVersion: "2",
          nodeOptions: {
            rejectUnauthorized: false, // TODO set up cert for go server correctly
          },
          useBinaryFormat: false,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (Connect, JSON, http) against @bufbuild/connect-node (h1)":
      (options?: Record<string, unknown>) =>
        createConnectTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: false,
        }),
    "@bufbuild/connect-node (Connect, binary, http) against @bufbuild/connect-node (h1)":
      (options?: Record<string, unknown>) =>
        createConnectTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: true,
        }),
    "@bufbuild/connect-node (Connect, binary, https) against @bufbuild/connect-node (h1 + tls)":
      (options?: Record<string, unknown>) =>
        createConnectTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1 + tls)"].getUrl(),
          httpVersion: "1.1",
          nodeOptions: {
            rejectUnauthorized: false, // TODO set up cert for go server correctly
          },
          useBinaryFormat: true,
        }),
    "@bufbuild/connect-node (Connect, JSON, https) against @bufbuild/connect-node (h1 + tls)":
      (options?: Record<string, unknown>) =>
        createConnectTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1 + tls)"].getUrl(),
          httpVersion: "1.1",
          nodeOptions: {
            rejectUnauthorized: false,
          },
          useBinaryFormat: false,
        }),
    "@bufbuild/connect-node (Connect, binary, http) against connect-go (h1)": (
      options?: Record<string, unknown>
    ) =>
      createConnectTransport({
        ...options,
        baseUrl: servers["connect-go (h1)"].getUrl(),
        httpVersion: "1.1",
        nodeOptions: {
          rejectUnauthorized: false, // TODO set up cert for go server correctly
        },
        useBinaryFormat: true,
      }),
    "@bufbuild/connect-node (Connect, JSON, http) against connect-go (h1)": (
      options?: Record<string, unknown>
    ) =>
      createConnectTransport({
        ...options,
        baseUrl: servers["connect-go (h1)"].getUrl(),
        httpVersion: "1.1",
        nodeOptions: {
          rejectUnauthorized: false, // TODO set up cert for go server correctly
        },
        useBinaryFormat: false,
      }),
    "@bufbuild/connect-node (Connect, binary, http, gzip) against connect-go (h1)":
      (options?: Record<string, unknown>) =>
        createConnectTransport({
          ...options,
          baseUrl: servers["connect-go (h1)"].getUrl(),
          httpVersion: "1.1",
          nodeOptions: {
            rejectUnauthorized: false, // TODO set up cert for go server correctly
          },
          useBinaryFormat: true,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (Connect, JSON, http, gzip) against connect-go (h1)":
      (options?: Record<string, unknown>) =>
        createConnectTransport({
          ...options,
          baseUrl: servers["connect-go (h1)"].getUrl(),
          httpVersion: "1.1",
          nodeOptions: {
            rejectUnauthorized: false, // TODO set up cert for go server correctly
          },
          useBinaryFormat: false,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (Connect, JSON, http, gzip) against @bufbuild/connect-node (h1)":
      (options?: Record<string, unknown>) =>
        createConnectTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          nodeOptions: {
            rejectUnauthorized: false,
          },
          useBinaryFormat: false,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (Connect, binary, http, gzip) against @bufbuild/connect-node (h1)":
      (options?: Record<string, unknown>) =>
        createConnectTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          nodeOptions: {
            rejectUnauthorized: false, // TODO set up cert for go server correctly
          },
          useBinaryFormat: true,
          sendCompression: compressionGzip,
        }),
    //gRPC-web
    "@bufbuild/connect-node (gRPC-web, binary, http2) against @bufbuild/connect-node (h2c)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          httpVersion: "2",
          baseUrl: servers["@bufbuild/connect-node (h2c)"].getUrl(),
          useBinaryFormat: true,
        }),
    "@bufbuild/connect-node (gRPC-web, JSON, http2) against @bufbuild/connect-node (h2c)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h2c)"].getUrl(),
          httpVersion: "2",
          useBinaryFormat: false,
        }),
    "@bufbuild/connect-node (gRPC-web, binary, http2) against connect-go (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["connect-go (h1)"].getUrl(),
          httpVersion: "2",
          nodeOptions: {
            rejectUnauthorized: false, // TODO set up cert for go server correctly
          },
          useBinaryFormat: true,
        }),
    "@bufbuild/connect-node (gRPC-web, binary, http2, gzip) against connect-go (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["connect-go (h1)"].getUrl(),
          httpVersion: "2",
          nodeOptions: {
            rejectUnauthorized: false, // TODO set up cert for go server correctly
          },
          useBinaryFormat: true,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (gRPC-web, JSON, http2, gzip) against connect-go (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["connect-go (h1)"].getUrl(),
          httpVersion: "2",
          nodeOptions: {
            rejectUnauthorized: false, // TODO set up cert for go server correctly
          },
          useBinaryFormat: false,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (gRPC-web, binary, http2, gzip) against @bufbuild/connect-node (h2c)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h2c)"].getUrl(),
          httpVersion: "2",
          nodeOptions: {
            rejectUnauthorized: false, // TODO set up cert for go server correctly
          },
          useBinaryFormat: true,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (gRPC-web, JSON, http2, gzip) against @bufbuild/connect-node (h2c)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h2c)"].getUrl(),
          httpVersion: "2",
          nodeOptions: {
            rejectUnauthorized: false, // TODO set up cert for go server correctly
          },
          useBinaryFormat: false,
          sendCompression: compressionGzip,
        }),
    "@bufbuild/connect-node (gRPC-web, JSON, http2) against connect-go (h1)": (
      options?: Record<string, unknown>
    ) =>
      createGrpcWebTransport({
        ...options,
        baseUrl: servers["connect-go (h1)"].getUrl(),
        httpVersion: "2",
        nodeOptions: {
          rejectUnauthorized: false, // TODO set up cert for go server correctly
        },
        useBinaryFormat: false,
      }),
    "@bufbuild/connect-node (gRPC-web, binary, http) against @bufbuild/connect-node (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: true,
        }),
    "@bufbuild/connect-node (gRPC-web, JSON, http) against @bufbuild/connect-node (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: false,
        }),
    "@bufbuild/connect-node (gRPC-web, JSON, https) against @bufbuild/connect-node (h1 + tls)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: false,
          nodeOptions: {
            rejectUnauthorized: false,
          },
        }),
    "@bufbuild/connect-node (gRPC-web, binary, https) against @bufbuild/connect-node (h1 + tls)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: true,
          nodeOptions: {
            rejectUnauthorized: false,
          },
        }),
    "@bufbuild/connect-node (gRPC-web, binary, https) against connect-go (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["connect-go (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: true,
          nodeOptions: {
            rejectUnauthorized: false,
          },
        }),
    "@bufbuild/connect-node (gRPC-web, JSON, https) against connect-go (h1)": (
      options?: Record<string, unknown>
    ) =>
      createGrpcWebTransport({
        ...options,
        baseUrl: servers["connect-go (h1)"].getUrl(),
        httpVersion: "1.1",
        useBinaryFormat: false,
        nodeOptions: {
          rejectUnauthorized: false,
        },
      }),
    "@bufbuild/connect-node (gRPC-web, JSON, http, gzip) against connect-go (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["connect-go (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: false,
          sendCompression: compressionGzip,
          nodeOptions: {
            rejectUnauthorized: false,
          },
        }),
    "@bufbuild/connect-node (gRPC-web, binary, http, gzip) against @bufbuild/connect-node (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: true,
          sendCompression: compressionGzip,
          nodeOptions: {
            rejectUnauthorized: false,
          },
        }),
    "@bufbuild/connect-node (gRPC-web, JSON, http, gzip) against @bufbuild/connect-node (h1)":
      (options?: Record<string, unknown>) =>
        createGrpcWebTransport({
          ...options,
          baseUrl: servers["@bufbuild/connect-node (h1)"].getUrl(),
          httpVersion: "1.1",
          useBinaryFormat: false,
          sendCompression: compressionGzip,
          nodeOptions: {
            rejectUnauthorized: false,
          },
        }),
  } as const;

  return {
    servers,
    transports,
    start(): Promise<void> {
      return Promise.all(Object.values(servers).map((s) => s.start())).then();
    },
    stop(): Promise<void> {
      return Promise.all(Object.values(servers).map((s) => s.stop())).then();
    },
    describeTransports(
      specDefinitions: (
        transport: () => Transport,
        transportName: keyof typeof transports
      ) => void
    ) {
      for (const [name, transportFactory] of Object.entries(transports)) {
        describe(name, () => {
          specDefinitions(transportFactory, name as keyof typeof transports);
        });
      }
    },
    describeTransportsExcluding(
      exclude: Array<keyof typeof transports>,
      specDefinitions: (
        transport: () => Transport,
        transportName: keyof typeof transports
      ) => void
    ) {
      for (const [name, transportFactory] of Object.entries(transports)) {
        if (exclude.includes(name as keyof typeof transports)) {
          continue;
        }
        describe(name, () => {
          specDefinitions(transportFactory, name as keyof typeof transports);
        });
      }
    },
    describeTransportsOnly(
      only: Array<keyof typeof transports>,
      specDefinitions: (
        transport: () => Transport,
        transportName: keyof typeof transports
      ) => void
    ) {
      for (const [name, transportFactory] of Object.entries(transports)) {
        if (only.includes(name as keyof typeof transports)) {
          describe(name, () => {
            specDefinitions(transportFactory, name as keyof typeof transports);
          });
        }
      }
    },
    describeServers(
      only: Array<keyof typeof servers>,
      specDefinitions: (
        server: (typeof servers)[keyof typeof servers],
        serverName: keyof typeof servers
      ) => void
    ) {
      for (const [name, server] of Object.entries(servers)) {
        if (only.includes(name as keyof typeof servers)) {
          describe(name, () => {
            specDefinitions(server, name as keyof typeof servers);
          });
        }
      }
    },
  };
}

let certLocalHost:
  | {
      key: string;
      cert: string;
    }
  | undefined;

function getCertLocalhost(): { key: string; cert: string } {
  if (certLocalHost === undefined) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let dir = new URL(import.meta.url).pathname;
    for (let i = 0; i < 10; i++) {
      if (fs.existsSync(path.join(dir, "package.json"))) {
        break;
      }
      dir = path.join(dir, "..");
    }
    const key = fs.readFileSync(path.join(dir, "localhost-key.pem"), {
      encoding: "utf8",
    });
    const cert = fs.readFileSync(path.join(dir, "localhost-cert.pem"), {
      encoding: "utf8",
    });
    certLocalHost = { key, cert };
  }
  return certLocalHost;
}

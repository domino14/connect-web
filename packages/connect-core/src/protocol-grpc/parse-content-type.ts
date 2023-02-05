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

/**
 * Parse a gRPC Content-Type header.
 */
export function parseContentType(
  contentType: string | null
): { binary: boolean } | undefined {
  const match = contentType
    ?.toLowerCase()
    ?.match(/^application\/grpc(?:\+(?:(json)(?:; ?charset=utf-?8)?|proto))?$/);
  if (!match) {
    return undefined;
  }
  const binary = !match[1];
  return { binary };
}

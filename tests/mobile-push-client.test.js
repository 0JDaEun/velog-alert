import test from "node:test";
import assert from "node:assert/strict";
import { normalizePushEvent } from "../src/mobile/push-client.js";

test("normalizePushEvent creates stable mobile event payload", () => {
  const result = normalizePushEvent({
    id: "feed-post:abc",
    type: "followPost",
    displayTitle: "Velog 새 게시물",
    displayMessage: "새 글이 올라왔습니다.",
    url: "https://velog.io/@user/post",
    createdAt: "2026-09-17T01:00:00.000Z",
  });

  assert.deepEqual(result, {
    eventKey: "followPost:feed-post:abc",
    type: "followPost",
    title: "Velog 새 게시물",
    body: "새 글이 올라왔습니다.",
    url: "https://velog.io/@user/post",
    createdAt: "2026-09-17T01:00:00.000Z",
  });
});

import apiClient from "./apiClient/index.js";
import assert from "assert";

// All requests should run at the same time and produce only one request to the backend. All requests should return or reject.
async function runTest() {
  const batchUrl = "/file-batch-api";

  // Should return [{id:”fileid1”},{id:”fileid2”}]
  apiClient
    .get(batchUrl, { params: { ids: ["fileid1", "fileid2"] } })
    .then((result) => {
      assert.deepEqual(result, {
        items: [{ id: "fileid1" }, { id: "fileid2" }],
      });
    });

  // Should return [{id:”fileid2”}]
  apiClient.get(batchUrl, { params: { ids: ["fileid2"] } }).then((result) => {
    assert.deepEqual(result, {
      items: [{ id: "fileid2" }],
    });
  });
  // Should reject as the fileid3 is missing from the responseF
  apiClient.get(batchUrl, { params: { ids: ["fileid3"] } }).catch((error) => {
    assert.equal(error.message, "File id not found!!!");
  });
}
runTest();

const { BlobServiceClient } = require("@azure/storage-blob");

const CONTAINER = "cutover-data";
const TASKS_BLOB = "tasks.json";
const LOG_BLOB = "log.json";

function getContainer() {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const blobService = BlobServiceClient.fromConnectionString(connStr);
  return blobService.getContainerClient(CONTAINER);
}

async function readBlob(blobName) {
  try {
    const container = getContainer();
    const blob = container.getBlobClient(blobName);
    const download = await blob.download(0);
    const chunks = [];
    for await (const chunk of download.readableStreamBody) {
      chunks.push(chunk);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    return JSON.parse(text);
  } catch (e) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}

async function writeBlob(blobName, data) {
  const container = getContainer();
  const blob = container.getBlockBlobClient(blobName);
  const content = JSON.stringify(data);
  await blob.upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: "application/json" },
  });
}

function corsHeaders(req) {
  const origin = process.env.CORS_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function isAdmin(req) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  const parts = token.split("::");
  if (parts.length < 2) return false;
  const name = parts[0];
  const role = parts[1];
  if (role !== "admin") return false;
  const adminNames = (process.env.ADMIN_NAMES || "").split(",").map(n => n.trim().toLowerCase());
  if (adminNames.includes(name.toLowerCase())) return true;
  const pass = parts[2] || "";
  return pass === (process.env.ADMIN_PASS || "");
}

module.exports = { TASKS_BLOB, LOG_BLOB, readBlob, writeBlob, corsHeaders, isAdmin };

const path = require("path");
const fs = require("fs");
const { app } = require("electron");
const Database = require("better-sqlite3");
const { v4: uuidv4 } = require("uuid");

let db;

function initDb() {
  const dbDir = app.isPackaged ? app.getPath("userData") : path.join(app.getAppPath(), "db");
  fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "memories.sqlite");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.prepare(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      createdAt TEXT,
      sourceApp TEXT,
      windowTitle TEXT,
      url TEXT,
      rawContext TEXT,
      summary TEXT,
      type TEXT,
      intent TEXT,
      topic TEXT,
      tags TEXT,
      sensitivity TEXT,
      usefulnessScore INTEGER,
      suggestedNextAction TEXT,
      title TEXT,
      isImportant INTEGER DEFAULT 0,
      screenshot TEXT
    )
  `).run();

  // Migrations: add session support columns
  const cols = db.prepare("PRAGMA table_info(memories)").all().map((c) => c.name);
  if (!cols.includes("sessionId")) {
    db.prepare("ALTER TABLE memories ADD COLUMN sessionId TEXT").run();
  }
  if (!cols.includes("isSubMemory")) {
    db.prepare("ALTER TABLE memories ADD COLUMN isSubMemory INTEGER DEFAULT 0").run();
  }
  if (!cols.includes("captureCount")) {
    db.prepare("ALTER TABLE memories ADD COLUMN captureCount INTEGER DEFAULT 0").run();
  }

  // Contexts table for generated summaries
  db.prepare(`
    CREATE TABLE IF NOT EXISTS contexts (
      id TEXT PRIMARY KEY,
      createdAt TEXT,
      title TEXT,
      content TEXT,
      sessionId TEXT,
      source TEXT
    )
  `).run();
}

function parseMemory(row) {
  if (!row) return null;
  let tags = [];
  try {
    tags = row.tags ? JSON.parse(row.tags) : [];
  } catch {
    tags = [];
  }

  let rawContext = {};
  try {
    rawContext = row.rawContext ? JSON.parse(row.rawContext) : {};
  } catch {
    rawContext = {};
  }

  return {
    ...row,
    rawContext,
    tags,
    isImportant: Boolean(row.isImportant),
    isSubMemory: Boolean(row.isSubMemory),
    captureCount: row.captureCount || 0,
    sessionId: row.sessionId || null,
  };
}

function saveMemory(memory) {
  const id = memory.id || uuidv4();
  const createdAt = memory.createdAt || memory.timestamp || new Date().toISOString();
  const rawContext = memory.rawContext || {};
  const info = db.prepare(`
    INSERT INTO memories (
      id, createdAt, sourceApp, windowTitle, url, rawContext, summary, type, intent, topic,
      tags, sensitivity, usefulnessScore, suggestedNextAction, title, isImportant, screenshot,
      sessionId, isSubMemory, captureCount
    ) VALUES (
      @id, @createdAt, @sourceApp, @windowTitle, @url, @rawContext, @summary, @type, @intent, @topic,
      @tags, @sensitivity, @usefulnessScore, @suggestedNextAction, @title, @isImportant, @screenshot,
      @sessionId, @isSubMemory, @captureCount
    )
  `).run({
    id,
    createdAt,
    sourceApp: memory.sourceApp || rawContext.sourceApp || "",
    windowTitle: memory.windowTitle || rawContext.windowTitle || "",
    url: memory.url || rawContext.url || null,
    rawContext: JSON.stringify(rawContext),
    summary: memory.summary || "",
    type: memory.type || "General Note",
    intent: memory.intent || "",
    topic: memory.topic || "",
    tags: JSON.stringify(Array.isArray(memory.tags) ? memory.tags : []),
    sensitivity: memory.sensitivity || "low",
    usefulnessScore: Number.isFinite(Number(memory.usefulnessScore)) ? Number(memory.usefulnessScore) : 0,
    suggestedNextAction: memory.suggestedNextAction || "",
    title: memory.title || "Untitled Memory",
    isImportant: memory.isImportant ? 1 : 0,
    screenshot: memory.screenshot || rawContext.screenshot || null,
    sessionId: memory.sessionId || null,
    isSubMemory: memory.isSubMemory ? 1 : 0,
    captureCount: memory.captureCount || 0,
  });

  return { id, changes: info.changes };
}

function getAllMemories() {
  return db
    .prepare("SELECT * FROM memories WHERE isSubMemory = 0 OR isSubMemory IS NULL ORDER BY createdAt DESC")
    .all()
    .map(parseMemory);
}

function searchMemories(query) {
  const like = `%${query || ""}%`;
  return db.prepare(`
    SELECT * FROM memories
    WHERE (isSubMemory = 0 OR isSubMemory IS NULL)
      AND (title LIKE @like
        OR summary LIKE @like
        OR rawContext LIKE @like
        OR tags LIKE @like
        OR topic LIKE @like)
    ORDER BY createdAt DESC
  `).all({ like }).map(parseMemory);
}

function filterMemories({ type, sourceApp, tag } = {}) {
  const where = ["(isSubMemory = 0 OR isSubMemory IS NULL)"];
  const params = {};
  if (type) {
    where.push("type = @type");
    params.type = type;
  }
  if (sourceApp) {
    where.push("sourceApp = @sourceApp");
    params.sourceApp = sourceApp;
  }
  if (tag) {
    where.push("tags LIKE @tag");
    params.tag = `%${tag}%`;
  }
  const sql = `SELECT * FROM memories WHERE ${where.join(" AND ")} ORDER BY createdAt DESC`;
  return db.prepare(sql).all(params).map(parseMemory);
}

function getMemoryById(id) {
  return parseMemory(db.prepare("SELECT * FROM memories WHERE id = ?").get(id));
}

function getSessionSubMemories(sessionId) {
  if (!sessionId) return [];
  return db
    .prepare("SELECT * FROM memories WHERE sessionId = ? AND isSubMemory = 1 ORDER BY createdAt ASC")
    .all(sessionId)
    .map(parseMemory);
}

function updateMemory(id, changes = {}) {
  const allowed = ["title", "summary"];
  const keys = allowed.filter((key) => Object.prototype.hasOwnProperty.call(changes, key));
  if (!keys.length) return { changes: 0 };
  const assignments = keys.map((key) => `${key} = @${key}`).join(", ");
  return db.prepare(`UPDATE memories SET ${assignments} WHERE id = @id`).run({ ...changes, id });
}

function deleteMemory(id) {
  // Also delete sub-memories if this is a session parent
  const memory = db.prepare("SELECT sessionId, isSubMemory FROM memories WHERE id = ?").get(id);
  if (memory && memory.sessionId && !memory.isSubMemory) {
    db.prepare("DELETE FROM memories WHERE sessionId = ? AND isSubMemory = 1").run(memory.sessionId);
  }
  return db.prepare("DELETE FROM memories WHERE id = ?").run(id);
}

function toggleImportant(id) {
  db.prepare("UPDATE memories SET isImportant = CASE isImportant WHEN 1 THEN 0 ELSE 1 END WHERE id = ?").run(id);
  return getMemoryById(id);
}

// --- Contexts ---
function saveContext(ctx) {
  const id = ctx.id || uuidv4();
  db.prepare(`
    INSERT INTO contexts (id, createdAt, title, content, sessionId, source)
    VALUES (@id, @createdAt, @title, @content, @sessionId, @source)
  `).run({
    id,
    createdAt: ctx.createdAt || new Date().toISOString(),
    title: ctx.title || "Untitled Context",
    content: ctx.content || "",
    sessionId: ctx.sessionId || null,
    source: ctx.source || "manual",
  });
  return { id };
}

function getAllContexts() {
  return db.prepare("SELECT * FROM contexts ORDER BY createdAt DESC").all();
}

function deleteContext(id) {
  return db.prepare("DELETE FROM contexts WHERE id = ?").run(id);
}

module.exports = {
  initDb,
  saveMemory,
  getAllMemories,
  searchMemories,
  filterMemories,
  getMemoryById,
  getSessionSubMemories,
  updateMemory,
  deleteMemory,
  toggleImportant,
  saveContext,
  getAllContexts,
  deleteContext,
};

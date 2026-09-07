(function initDraftStore(global) {
  "use strict";

  const DATABASE_NAME = "beautylab-local-drafts";
  const DATABASE_VERSION = 1;

  function storageError(error) {
    if (error?.isDraftStorageError) return error;
    const name = error?.name || "Error";
    const code = name === "QuotaExceededError" ? "QUOTA_EXCEEDED"
      : name === "DataCloneError" || name === "DataError" || name === "TypeError" ? "INVALID_DATA"
        : "STORAGE_UNAVAILABLE";
    const message = code === "QUOTA_EXCEEDED" ? "The browser has no space available for this draft."
      : code === "INVALID_DATA" ? "The draft could not be stored because its data is invalid."
        : "Local draft storage is unavailable in this browser.";
    return Object.assign(new Error(message), { code, cause: error, isDraftStorageError: true });
  }

  function identifier() {
    return global.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function versionMetadata(version) {
    return {
      versionId: version.versionId,
      documentId: version.documentId,
      sequence: version.sequence,
      savedAt: version.savedAt,
    };
  }

  function create(options = {}) {
    const databaseName = options.databaseName || DATABASE_NAME;
    const maxVersions = Number.isInteger(options.maxVersions) ? Math.max(2, Math.min(100, options.maxVersions)) : 20;
    let connection = null;
    let opening = null;

    function open() {
      if (connection) return Promise.resolve(connection);
      if (opening) return opening;
      opening = new Promise((resolve, reject) => {
        let request;
        let abandoned = false;
        try {
          if (!global.indexedDB) throw new Error("IndexedDB is not available.");
          request = global.indexedDB.open(databaseName, DATABASE_VERSION);
        } catch (error) {
          reject(storageError(error));
          return;
        }
        request.onupgradeneeded = () => {
          const database = request.result;
          database.createObjectStore("documents", { keyPath: "id" });
          const versions = database.createObjectStore("versions", { keyPath: "versionId" });
          versions.createIndex("documentId", "documentId", { unique: false });
          database.createObjectStore("snapshots", { keyPath: "versionId" });
        };
        request.onerror = () => reject(storageError(request.error));
        request.onblocked = () => {
          abandoned = true;
          reject(storageError(new Error("Another tab is blocking local draft storage.")));
        };
        request.onsuccess = () => {
          const database = request.result;
          if (abandoned) { database.close(); return; }
          connection = database;
          database.onversionchange = () => {
            database.close();
            if (connection === database) connection = null;
          };
          database.onclose = () => { if (connection === database) connection = null; };
          resolve(database);
        };
      }).finally(() => { opening = null; });
      return opening;
    }

    async function transaction(mode, operation) {
      const database = await open();
      return new Promise((resolve, reject) => {
        let tx;
        let result;
        let failure;
        try {
          tx = database.transaction(["documents", "versions", "snapshots"], mode);
          tx.oncomplete = () => resolve(result);
          tx.onabort = () => reject(storageError(failure || tx.error));
          tx.onerror = () => { failure ||= tx.error; };
          operation({
            documents: tx.objectStore("documents"),
            versions: tx.objectStore("versions"),
            snapshots: tx.objectStore("snapshots"),
            setResult: (value) => { result = value; },
            guard: (callback) => (...args) => {
              try { callback(...args); } catch (error) { failure = error; tx.abort(); }
            },
          });
        } catch (error) {
          failure = error;
          if (tx) tx.abort();
          else reject(storageError(error));
        }
      });
    }

    async function save(input) {
      let payload;
      let id;
      let name;
      try {
        if (!input || input.payload === undefined || (input.id !== undefined && (typeof input.id !== "string" || !input.id))) {
          throw new TypeError("A draft payload and an optional non-empty string id are required.");
        }
        id = input.id || identifier();
        name = String(input.name || "Untitled.html");
        payload = global.structuredClone ? global.structuredClone(input.payload) : input.payload;
      } catch (error) { throw storageError(error); }

      return transaction("readwrite", ({ documents, versions, snapshots, setResult, guard }) => {
        const currentRequest = documents.get(id);
        currentRequest.onsuccess = guard(() => {
          const previous = currentRequest.result;
          const existingRequest = versions.index("documentId").getAll(id);
          existingRequest.onsuccess = guard(() => {
            const existing = existingRequest.result.sort((a, b) => b.sequence - a.sequence);
            const savedAt = Date.now();
            const versionId = identifier();
            const sequence = (previous?.versionSequence || 0) + 1;
            const metadata = {
              id,
              name,
              createdAt: previous?.createdAt || savedAt,
              updatedAt: savedAt,
              latestVersionId: versionId,
              versionSequence: sequence,
              versionCount: Math.min(existing.length + 1, maxVersions),
            };
            // Keep the previous draft intact unless the new version and metadata both commit.
            versions.put({ versionId, documentId: id, sequence, savedAt });
            snapshots.put({ versionId, payload });
            documents.put(metadata);
            existing.slice(maxVersions - 1).forEach((version) => {
              versions.delete(version.versionId);
              snapshots.delete(version.versionId);
            });
            setResult(metadata);
          });
        });
      });
    }

    function list() {
      return transaction("readonly", ({ documents, setResult, guard }) => {
        const request = documents.getAll();
        request.onsuccess = guard(() => {
          setResult(request.result.sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt || a.id.localeCompare(b.id)));
        });
      });
    }

    function get(id, versionId) {
      return transaction("readonly", ({ documents, versions, snapshots, setResult, guard }) => {
        const documentRequest = documents.get(id);
        documentRequest.onsuccess = guard(() => {
          const metadata = documentRequest.result;
          if (!metadata) { setResult(null); return; }
          const versionRequest = versions.get(versionId || metadata.latestVersionId);
          versionRequest.onsuccess = guard(() => {
            const version = versionRequest.result;
            if (version?.documentId !== id) { setResult(null); return; }
            const snapshotRequest = snapshots.get(version.versionId);
            snapshotRequest.onsuccess = guard(() => {
              if (!snapshotRequest.result) throw new Error("The saved draft snapshot is missing.");
              setResult({ metadata, ...versionMetadata(version), payload: snapshotRequest.result.payload });
            });
          });
        });
      });
    }

    function versions(id) {
      return transaction("readonly", ({ versions: versionStore, setResult, guard }) => {
        const request = versionStore.index("documentId").getAll(id);
        request.onsuccess = guard(() => {
          setResult(request.result.sort((a, b) => b.sequence - a.sequence).map(versionMetadata));
        });
      });
    }

    function remove(id) {
      return transaction("readwrite", ({ documents, versions: versionStore, snapshots, setResult, guard }) => {
        const request = versionStore.index("documentId").getAllKeys(id);
        request.onsuccess = guard(() => {
          request.result.forEach((versionId) => {
            versionStore.delete(versionId);
            snapshots.delete(versionId);
          });
          documents.delete(id);
          setResult(true);
        });
      });
    }

    async function close() {
      const database = connection || (opening ? await opening : null);
      database?.close();
      if (connection === database) connection = null;
    }

    return { save, list, get, versions, remove, close };
  }

  global.BeautyLabDrafts = { create };
})(window);

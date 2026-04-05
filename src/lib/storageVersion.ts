/**
 * STORAGE VERSIONING
 *
 * Tracks the schema version of localStorage data and applies migrations
 * so that breaking changes (new fields, renamed keys, etc.) don't corrupt
 * existing user data.
 */

const STORAGE_VERSION_KEY = '__msaas_storage_version';

// Increment this constant when adding a migration below.
const CURRENT_VERSION = 2;

type Migration = {
  version: number;
  description: string;
  apply: () => void;
};

const MIGRATIONS: Migration[] = [
  // ─── v1 ──────────────────────────────────────────────────────────
  {
    version: 1,
    description: 'Standardized clients key (removed legacy local_customers)',
    apply() {
      const legacyKey = 'local_customers';
      const currentKey = 'local_clients';
      try {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw && !localStorage.getItem(currentKey)) {
          localStorage.setItem(currentKey, legacyRaw);
        }
        // Clean up legacy key
        localStorage.removeItem(legacyKey);
      } catch {
        // Ignore — key may not exist
      }
    },
  },

  // ─── v2 ──────────────────────────────────────────────────────────
  {
    version: 2,
    description: 'Validate & default numeric fields on local_ingredients',
    apply() {
      const key = 'local_ingredients';
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const items = JSON.parse(raw);
        if (!Array.isArray(items)) return;
        const numFields = [
          'cost_per_unit', 'estoque_atual', 'estoque_minimo', 'sort_order',
        ] as const;
        let changed = false;
        const migrated = items.map((item: Record<string, unknown>) => {
          for (const field of numFields) {
            if (field in (item ?? {}) && typeof item[field] !== 'number') {
              const n = parseFloat(item[field] as string);
              if (!isNaN(n)) { item[field] = n; changed = true; }
            }
          }
          return item;
        });
        if (changed) localStorage.setItem(key, JSON.stringify(migrated));
      } catch { /* ignore corrupt data */ }
    },
  },
];

/**
 * Returns the current storage version.
 * Returns 0 if never been versioned (first run, old user).
 */
function getStoredVersion(): number {
  const raw = localStorage.getItem(STORAGE_VERSION_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

/**
 * Persists the storage version marker.
 */
function setStoredVersion(version: number) {
  localStorage.setItem(STORAGE_VERSION_KEY, String(version));
}

/**
 * Runs all pending migrations sequentially.
 * Should be called once, early in app bootstrap.
 */
export function runStorageMigrations() {
  const currentVersion = getStoredVersion();
  if (currentVersion >= CURRENT_VERSION) return;

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion);
  for (const migration of pending) {
    try {
      migration.apply();
      setStoredVersion(migration.version);
    } catch (err) {
      // Stop the chain — don't run future migrations
      // so we don't compound a partially-applied migration
      console.error(
        `[StorageMigration v${migration.version}] Failed:`,
        migration.description,
        err,
      );
      setStoredVersion(migration.version - 1);
      break;
    }
  }
}

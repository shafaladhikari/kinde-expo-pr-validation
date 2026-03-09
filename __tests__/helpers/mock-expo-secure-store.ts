/**
 * Shared test infrastructure for mocking @kinde/expo/utils ExpoSecureStore.
 *
 * Provides both the buggy (forEach async) and fixed (Promise.all) variants
 * so that regression and component tests use identical implementations.
 */

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * In-memory fake native secure store.
 * Replaces expo-secure-store behavior for deterministic testing.
 */
export class FakeNativeSecureStore {
  private store = new Map<string, string>();

  async setItemAsync(key: string, value: string): Promise<void> {
    await delay(50);
    this.store.set(key, value);
  }

  async getItemAsync(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  async deleteItemAsync(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  dump() {
    return Array.from(this.store.entries());
  }
}

export function splitString(value: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }
  return chunks;
}

/**
 * Mocks @kinde/expo/utils, replacing ExpoSecureStore with a buggy or fixed
 * variant while preserving real exports (StorageKeys, etc.).
 *
 * ExpoSecureStore is returned in the same shape as the real library:
 *   ExpoSecureStore.default() -> Promise<Class>
 */
export function mockExpoUtilsWithStoreVariant(variant: "buggy" | "fixed") {
  jest.doMock("@kinde/expo/utils", () => {
    const actual = jest.requireActual("@kinde/expo/utils");

    const storageSettings = {
      keyPrefix: "kinde_",
      maxLength: 2048,
    };

    const SessionBase =
      actual.SessionBase ??
      class {
        protected notifyListeners() {
          // no-op fallback if SessionBase is not publicly exported
        }
      };

    const StorageKeys = actual.StorageKeys;

    const nativeStore = new FakeNativeSecureStore();

    async function waitForExpoSecureStore() {
      let tries = 0;
      while (tries < 20) {
        await delay(1);
        tries++;
        return;
      }
    }

    class BuggyExpoSecureStore extends SessionBase {
      asyncStore = true;

      async destroySession(): Promise<void> {
        const keys = Object.values(StorageKeys);
        // Old buggy style
        keys.forEach(async (key) => {
          await this.removeSessionItem(String(key));
        });
        this.notifyListeners?.();
      }

      async setSessionItem(itemKey: string, itemValue: unknown): Promise<void> {
        await waitForExpoSecureStore();
        await this.removeSessionItem(itemKey);

        if (typeof itemValue !== "string") {
          throw new Error("Item value must be a string");
        }

        // BUG: forEach(async ...) does not await writes
        splitString(
          itemValue,
          Math.min(storageSettings.maxLength, 2048),
        ).forEach(async (splitValue, index) => {
          await nativeStore.setItemAsync(
            `${storageSettings.keyPrefix}${itemKey}${index}`,
            splitValue,
          );
        });

        this.notifyListeners?.();
      }

      async getSessionItem(itemKey: string): Promise<unknown | null> {
        await waitForExpoSecureStore();

        const chunks: string[] = [];
        let index = 0;

        let chunk = await nativeStore.getItemAsync(
          `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
        );

        while (chunk) {
          chunks.push(chunk);
          index++;
          chunk = await nativeStore.getItemAsync(
            `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
          );
        }

        return chunks.join("") || null;
      }

      async removeSessionItem(itemKey: string): Promise<void> {
        await waitForExpoSecureStore();

        let index = 0;

        let chunk = await nativeStore.getItemAsync(
          `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
        );

        while (chunk) {
          await nativeStore.deleteItemAsync(
            `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
          );
          index++;
          chunk = await nativeStore.getItemAsync(
            `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
          );
        }

        this.notifyListeners?.();
      }
    }

    class FixedExpoSecureStore extends SessionBase {
      asyncStore = true;

      async destroySession(): Promise<void> {
        const keys = Object.values(StorageKeys);
        await Promise.all(
          keys.map((key) => this.removeSessionItem(String(key))),
        );
        this.notifyListeners?.();
      }

      async setSessionItem(itemKey: string, itemValue: unknown): Promise<void> {
        await waitForExpoSecureStore();
        await this.removeSessionItem(itemKey);

        if (typeof itemValue !== "string") {
          throw new Error("Item value must be a string");
        }

        const chunks = splitString(
          itemValue,
          Math.min(storageSettings.maxLength, 2048),
        );

        // FIX: wait for all writes
        await Promise.all(
          chunks.map((splitValue, index) =>
            nativeStore.setItemAsync(
              `${storageSettings.keyPrefix}${itemKey}${index}`,
              splitValue,
            ),
          ),
        );

        this.notifyListeners?.();
      }

      async getSessionItem(itemKey: string): Promise<unknown | null> {
        await waitForExpoSecureStore();

        const chunks: string[] = [];
        let index = 0;

        let chunk = await nativeStore.getItemAsync(
          `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
        );

        while (chunk) {
          chunks.push(chunk);
          index++;
          chunk = await nativeStore.getItemAsync(
            `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
          );
        }

        return chunks.join("") || null;
      }

      async removeSessionItem(itemKey: string): Promise<void> {
        await waitForExpoSecureStore();

        let index = 0;

        let chunk = await nativeStore.getItemAsync(
          `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
        );

        while (chunk) {
          await nativeStore.deleteItemAsync(
            `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
          );
          index++;
          chunk = await nativeStore.getItemAsync(
            `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
          );
        }

        this.notifyListeners?.();
      }
    }

    const SelectedCtor =
      variant === "buggy" ? BuggyExpoSecureStore : FixedExpoSecureStore;

    return {
      ...actual,
      ExpoSecureStore: {
        __esModule: true,
        default: async () => SelectedCtor,
      },
    };
  });
}

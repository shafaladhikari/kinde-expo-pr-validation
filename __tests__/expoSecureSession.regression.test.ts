import {
  delay,
  mockExpoUtilsWithStoreVariant,
} from "./helpers/mock-expo-secure-store";

describe("ExpoSecureStore regression via @kinde/expo/utils export", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("buggy exported ExpoSecureStore can return null on immediate read", async () => {
    mockExpoUtilsWithStoreVariant("buggy");

    const { ExpoSecureStore, StorageKeys } = require("@kinde/expo/utils");

    const SecureStoreCtor = await ExpoSecureStore.default();
    const store = new SecureStoreCtor();

    await store.setSessionItem(StorageKeys.accessToken, "test");

    const item = await store.getSessionItem(StorageKeys.accessToken);

    expect(item).toBeNull();
  });

  test("buggy exported ExpoSecureStore eventually returns value after writes finish", async () => {
    mockExpoUtilsWithStoreVariant("buggy");

    const { ExpoSecureStore, StorageKeys } = require("@kinde/expo/utils");

    const SecureStoreCtor = await ExpoSecureStore.default();
    const store = new SecureStoreCtor();

    await store.setSessionItem(StorageKeys.accessToken, "test");

    await delay(120);

    const item = await store.getSessionItem(StorageKeys.accessToken);

    expect(item).toBe("test");
  });

  test("fixed exported ExpoSecureStore returns value immediately after set", async () => {
    mockExpoUtilsWithStoreVariant("fixed");

    const { ExpoSecureStore, StorageKeys } = require("@kinde/expo/utils");

    const SecureStoreCtor = await ExpoSecureStore.default();
    const store = new SecureStoreCtor();

    await store.setSessionItem(StorageKeys.accessToken, "test");

    const item = await store.getSessionItem(StorageKeys.accessToken);

    expect(item).toBe("test");
  });
});

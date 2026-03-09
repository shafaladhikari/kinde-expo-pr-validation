import React from "react";
import { Text } from "react-native";
import { render, waitFor, cleanup } from "@testing-library/react-native";
import { mockExpoUtilsWithStoreVariant } from "./helpers/mock-expo-secure-store";

function installMocks(mode: "buggy" | "fixed") {
  mockExpoUtilsWithStoreVariant(mode);

  const Ctx = React.createContext({ isAuthenticated: false, isLoading: true });

  jest.doMock("@kinde/expo", () => {
    const utils = require("@kinde/expo/utils");

    function KindeAuthProvider({ children }: { children: React.ReactNode }) {
      const [state, setState] = React.useState({
        isAuthenticated: false,
        isLoading: true,
      });

      React.useEffect(() => {
        let alive = true;
        (async () => {
          const Ctor = await utils.ExpoSecureStore.default();
          const store = new Ctor();

          await store.setSessionItem(utils.StorageKeys.accessToken, "tok-123");
          const token = await store.getSessionItem(
            utils.StorageKeys.accessToken,
          );

          if (alive) {
            setState({ isAuthenticated: Boolean(token), isLoading: false });
          }
        })();
        return () => {
          alive = false;
        };
      }, []);

      return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
    }

    function useKindeAuth() {
      return React.useContext(Ctx);
    }

    return { __esModule: true, KindeAuthProvider, useKindeAuth };
  });
}

function buildApp() {
  const { KindeAuthProvider, useKindeAuth } = require("@kinde/expo");

  function Screen() {
    const { isAuthenticated, isLoading } = useKindeAuth();
    if (isLoading) return <Text>loading</Text>;
    return (
      <Text>{isAuthenticated ? "authenticated" : "not authenticated"}</Text>
    );
  }

  function App() {
    return (
      <KindeAuthProvider
        config={{ domain: "https://example.kinde.com", clientId: "cid" }}
      >
        <Screen />
      </KindeAuthProvider>
    );
  }

  return App;
}

describe("Bootstrap auth-state regression (ExpoSecureStore write race)", () => {
  afterEach(() => {
    cleanup();
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("buggy store: setSessionItem resolves before write → reads null → not authenticated", async () => {
    installMocks("buggy");
    const App = buildApp();

    const { getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText("not authenticated")).toBeTruthy();
    });
  });

  test("fixed store: setSessionItem awaits write → reads token → authenticated", async () => {
    installMocks("fixed");
    const App = buildApp();

    const { getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText("authenticated")).toBeTruthy();
    });
  });
});

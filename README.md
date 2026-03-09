# Validation of ExpoSecureStore Race Condition Fix

## Goal

Validate the PR that upgrades `@kinde/js-utils` in the `@kinde/expo` SDK
and confirm whether it resolves the SecureStore race condition without
breaking the Expo integration.

------------------------------------------------------------------------

# Testing Procedure

## 1. Attempt to Replicate the Issue in a Real Expo App

I first attempted to reproduce the race condition using a simple
authentication flow in an Expo test application using the `@kinde/expo`
SDK.

However, the issue was difficult to reproduce reliably because
SecureStore writes complete very quickly in practice. As a result, the
read operation usually happened after the write had already completed,
making the race condition hard to trigger consistently.

------------------------------------------------------------------------

# 2. Controlled Test Using a Mocked SecureStore

To make the issue deterministic, I created a controlled test
environment.

Steps:

-   Mocked `expo-secure-store`
-   Added an artificial delay inside `setItemAsync()` to simulate slow
    persistence
-   This reliably exposed the race condition scenario

Because `ExpoSecureStore` is dynamically imported inside
`@kinde/js-utils`, injecting a mock directly was difficult. To work
around this, I mocked the **entire ExpoSecureStore export** from
`@kinde/js-utils`.

Two versions were implemented:

-   **Buggy version** -- current implementation using
    `forEach(async ...)`
-   **Fixed version** -- proposed PR implementation using
    `Promise.all(...)`

------------------------------------------------------------------------

# 3. Regression Tests

Using these mocked implementations I created regression tests.

Results:

### Buggy Implementation

-   `setSessionItem()` resolves before async writes complete
-   Immediate reads may return `null`

### Fixed Implementation

-   `setSessionItem()` waits for all writes to finish
-   Immediate reads consistently return the stored value

This confirmed both the presence of the race condition and the
correctness of the proposed fix.

------------------------------------------------------------------------

# 4. Expo Render Test

To simulate real application behavior:

-   Created an Expo render test for an authentication page
-   Used mocked secure store implementations

Results:

Buggy implementation → App renders **not authenticated**

Fixed implementation → App renders **authenticated**

This confirmed the practical impact of the race condition in the
authentication workflow.

------------------------------------------------------------------------

# 5. Testing the Actual Dependency Upgrade

Next, I validated the real dependency upgrade path.

Steps:

1.  Forked `@kinde/expo`
2.  Updated its dependency to the newer `@kinde/js-utils`
3.  Used the forked package inside the Expo test app

Running the app produced the following error:

`Failed to initialize storage: TypeError: Cannot read property 'ExpoSecureStore' of undefined`

Tracing the issue revealed the following dynamic import:

    const mod = await import(
      /* webpackIgnore: true */ "./sessionManager/stores/expoSecureStore.js"
    );

Because `webpackIgnore: true` instructs the bundler to ignore this
module, the file is not included in the build output, causing the
runtime import to fail in the Expo environment.

------------------------------------------------------------------------

# 6. Further Investigation

To confirm the root cause:

1.  Forked the latest `@kinde/js-utils`
2.  Removed `webpackIgnore: true`
3.  Built the package locally
4.  Used it as a dependency inside the forked `@kinde/expo`
5.  Used that fork in the Expo test app

After this change:

-   The Expo app ran successfully
-   Authentication flow worked correctly
-   The race condition fix functioned as expected

------------------------------------------------------------------------

# Conclusion

The race condition fix introduced in the updated `@kinde/js-utils`
implementation is correct and resolves the async write issue.

However, upgrading the dependency directly inside `@kinde/expo`
currently breaks the package because the new implementation uses:

`webpackIgnore: true`

This prevents the `expoSecureStore` module from being bundled, which
causes the dynamic import to fail in the Expo environment.

------------------------------------------------------------------------

# Final Assessment

-   The race condition fix is valid.
-   The dependency upgrade alone breaks the `@kinde/expo` package due to
    the ignored dynamic import.
-   The upgrade requires either removing `webpackIgnore: true` or
    adjusting the bundling strategy so the ignored module is available
    at runtime.

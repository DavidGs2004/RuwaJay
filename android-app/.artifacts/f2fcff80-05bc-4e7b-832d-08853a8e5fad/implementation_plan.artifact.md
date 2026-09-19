# Implementation Plan - Project Integration and Testing Readiness

The project has a good structure with custom themes, navigation, and screens, but these components are not yet integrated into the `MainActivity`. This plan will connect the navigation system and add a basic UI test suite to ensure the app is ready for development and testing.

## User Review Required

> [!IMPORTANT]
> The `MainActivity` currently displays a placeholder "Hello Android" greeting. I will replace this with the `AppNavigation` and `BottomNavBar` components defined in the project.

## Proposed Changes

### UI Integration

#### [MODIFY] [MainActivity.kt](file:///C:/Aplicaciones_Android/proyectoExpo/RuwaJay/android-app/app/src/main/java/com/example/ruwajay/MainActivity.kt)
- Integrate `rememberNavController()`.
- Use `Scaffold` to host `BottomNavBar` and `AppNavigation`.
- Remove the placeholder `Greeting` composable.

### Testing Setup

#### [NEW] [AppNavigationTest.kt](file:///C:/Aplicaciones_Android/proyectoExpo/RuwaJay/android-app/app/src/androidTest/java/com/example/ruwajay/AppNavigationTest.kt)
- Create a basic UI test to verify:
    - The app starts on the "Inicio" (Home) screen.
    - Navigation to "Explorar" and "Perfil" works via the bottom bar.

## Verification Plan

### Automated Tests
- Run the new UI test using `./gradlew connectedDebugAndroidTest`.
- Run existing unit tests using `./gradlew test`.

### Manual Verification
- Deploy the app to a device/emulator and verify that the bottom navigation bar correctly switches between screens.

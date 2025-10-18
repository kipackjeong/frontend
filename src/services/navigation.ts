import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate to a screen with type-safe parameters
 * @param name Screen name to navigate to
 * @param params Screen-specific parameters
 */
export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  }
}

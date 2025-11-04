/**
 * Helper utilities for Safe Area handling across iOS and Android
 */

/**
 * Safe area edges configuration for different screen types
 */
export const SAFE_AREA_EDGES = {
  // For screens with headers (use top padding from safe area)
  withHeader: ['top'] as const,
  
  // For full screen modals or pages
  fullScreen: ['top', 'bottom'] as const,
  
  // For screens without custom header (tab screens)
  tabScreen: ['top'] as const,
  
  // For bottom sheets or modals from bottom
  bottomModal: ['bottom'] as const,
  
  // No safe area needed (already handled by parent)
  none: [] as const,
};

/**
 * Get safe area edges based on screen type
 */
export function getSafeAreaEdges(screenType: keyof typeof SAFE_AREA_EDGES) {
  return SAFE_AREA_EDGES[screenType];
}

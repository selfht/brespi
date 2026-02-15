/**
 * Centralized sizing constants for the JointJS canvas.
 * All values are in pixels since JointJS only works with pixel values.
 */
export namespace Sizing {
  /**
   * Block dimensions (actual visual size)
   */
  export const BLOCK_WIDTH = 60;
  export const BLOCK_HEIGHT = 45;
  export const BLOCK_BORDER_RADIUS = 8;
  export const BLOCK_STROKE_WIDTH = 1;

  /**
   * Input/Output connector (port) sizing
   */
  export const CONNECTOR_WIDTH = 14;
  export const CONNECTOR_HEIGHT = CONNECTOR_WIDTH;
  export const CONNECTOR_BORDER_RADIUS = 4;
  export const CONNECTOR_OFFSET = 6;
  export const CONNECTOR_STROKE_WIDTH = BLOCK_STROKE_WIDTH;

  /**
   * Block label styling
   */
  export const LABEL_FONT_SIZE = 14;
  export const LABEL_Y_OFFSET = 18; // Distance below block

  /**
   * Callout (details popup) sizing
   */
  export const CALLOUT_WIDTH = 240;
  export const CALLOUT_Y_OFFSET = 16; // Distance below label
  export const CALLOUT_PADDING = 8;
  export const CALLOUT_GAP = 12;
  export const CALLOUT_LABEL_FONT_SIZE = 18;
  export const CALLOUT_KEY_FONT_SIZE = 14;
  export const CALLOUT_VALUE_FONT_SIZE = 14;
  export const CALLOUT_LINE_HEIGHT = 1.25;
  export const CALLOUT_BORDER_RADIUS = 8;
  export const CALLOUT_BORDER_WIDTH = 3;

  /**
   * SVG spinner sizing
   */
  export const SPINNER_SIZE = 20;
  export const SPINNER_STROKE_WIDTH = 2;
  export const SPINNER_RADIUS = (SPINNER_SIZE - SPINNER_STROKE_WIDTH) / 2;
  export const SPINNER_CIRCUMFERENCE = 2 * Math.PI * SPINNER_RADIUS;
  export const SPINNER_DASH_ARRAY = `${SPINNER_CIRCUMFERENCE * 0.75} ${SPINNER_CIRCUMFERENCE * 0.25}`;

  /**
   * Step icon sizing
   */
  export const ICON_HEIGHT = 30;

  /**
   * Link (connection arrow) styling
   */
  export const LINK_STROKE_WIDTH = 2;

  /**
   * Paper interaction thresholds
   */
  export const CLICK_THRESHOLD = 10; // Max movement (px) to still count as click
  export const MAGNET_THRESHOLD = 5; // Min movement (px) before starting link creation
  export const PAN_THRESHOLD = 5; // Min movement (px) before starting pan
  export const CONNECTION_POINT_OFFSET = 8; // Offset for connection points on block boundary

  /**
   * Grid layout spacing for positioning blocks
   */
  export const GRID_START_X = 100;
  export const GRID_START_Y = 50;
  export const GRID_HORIZONTAL_SPACING = 140;
  export const GRID_VERTICAL_SPACING = 70;
}

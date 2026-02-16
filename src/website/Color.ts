const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
type Shade = (typeof shades)[number];

export class Color {
  // Custom colors
  public static primary = () => this.css("--color-c-primary");
  public static success = () => this.css("--color-c-success");
  public static error = () => this.css("--color-c-error");
  public static accent = () => this.css("--color-c-accent");
  public static dim = () => this.css("--color-c-dim");
  public static dark = () => this.css("--color-c-dark");
  public static canvasblockDefaultInner = () => this.css("--color-c-canvasblock-default-inner");
  public static canvasblockDefaultOuter = () => this.css("--color-c-canvasblock-default-outer");
  public static canvasblockUnusedInner = () => this.css("--color-c-canvasblock-unused-inner");
  public static canvasblockUnusedOuter = () => this.css("--color-c-canvasblock-unused-outer");
  /*
   * Default colors
   *
   * These must be "inlined" inside `index.css`, otherwise they aren't detected by tailwindcss,
   * which means they'll be tree-shaken; see `index.css`
   */
  public static gray = (shade: Shade) => this.css(`--color-gray-${shade}`);
  public static red = (shade: Shade) => this.css(`--color-red-${shade}`);
  public static green = (shade: Shade) => this.css(`--color-green-${shade}`);

  private static cache: Record<string, string> = {};

  private static css(name: string): string {
    let value = this.cache[name];
    if (!value) {
      value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (!value) {
        throw new Error(`Couldn't determine color: ${name}`);
      }
      this.cache[name] = value;
    }
    return value;
  }

  static {
    Object.values(this).forEach((fieldFn) => {
      if (typeof fieldFn === "function") {
        // check if there's any color which throws an error
        shades.forEach(fieldFn);
      }
    });
  }
}

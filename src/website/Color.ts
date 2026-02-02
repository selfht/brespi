type Shade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

export class Color {
  // Custom colors
  public static primary = () => this.css("--color-c-primary");
  public static success = () => this.css("--color-c-success");
  public static error = () => this.css("--color-c-error");
  public static info = () => this.css("--color-c-info");
  public static dim = () => this.css("--color-c-dim");
  public static dark = () => this.css("--color-c-dark");
  public static canvasblockDefaultInner = () => this.css("--color-c-canvasblock-default-inner");
  public static canvasblockDefaultOuter = () => this.css("--color-c-canvasblock-default-outer");
  public static canvasblockUnusedInner = () => this.css("--color-c-canvasblock-unused-inner");
  public static canvasblockUnusedOuter = () => this.css("--color-c-canvasblock-unused-outer");

  // Tailwind default colors (from CSS custom properties)
  public static slate = (shade: Shade) => this.css(`--color-slate-${shade}`);
  public static gray = (shade: Shade) => this.css(`--color-gray-${shade}`);
  public static zinc = (shade: Shade) => this.css(`--color-zinc-${shade}`);
  public static neutral = (shade: Shade) => this.css(`--color-neutral-${shade}`);
  public static stone = (shade: Shade) => this.css(`--color-stone-${shade}`);
  public static red = (shade: Shade) => this.css(`--color-red-${shade}`);
  public static orange = (shade: Shade) => this.css(`--color-orange-${shade}`);
  public static amber = (shade: Shade) => this.css(`--color-amber-${shade}`);
  public static yellow = (shade: Shade) => this.css(`--color-yellow-${shade}`);
  public static lime = (shade: Shade) => this.css(`--color-lime-${shade}`);
  public static green = (shade: Shade) => this.css(`--color-green-${shade}`);
  public static emerald = (shade: Shade) => this.css(`--color-emerald-${shade}`);
  public static teal = (shade: Shade) => this.css(`--color-teal-${shade}`);
  public static cyan = (shade: Shade) => this.css(`--color-cyan-${shade}`);
  public static sky = (shade: Shade) => this.css(`--color-sky-${shade}`);
  public static blue = (shade: Shade) => this.css(`--color-blue-${shade}`);
  public static indigo = (shade: Shade) => this.css(`--color-indigo-${shade}`);
  public static violet = (shade: Shade) => this.css(`--color-violet-${shade}`);
  public static purple = (shade: Shade) => this.css(`--color-purple-${shade}`);
  public static fuchsia = (shade: Shade) => this.css(`--color-fuchsia-${shade}`);
  public static pink = (shade: Shade) => this.css(`--color-pink-${shade}`);
  public static rose = (shade: Shade) => this.css(`--color-rose-${shade}`);

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
    Object.values(this).forEach((field) => {
      if (typeof field === "function") {
        // check if there's any color which throws an error
        field(100);
      }
    });
  }
}

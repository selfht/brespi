import { ReactNode } from "react";
import { Button } from "../comps/Button";
import { DialogManager } from "../comps/DialogManager";
import { Icon } from "../comps/Icon";
import { Modal } from "../comps/Modal";

type RenderArgs = {
  resolve(value: boolean): void;
  yesNoButtons(opts?: { noLabel?: string; noTheme?: Button.Theme; yesLabel?: string; yesTheme?: Button.Theme }): ReactNode;
};
type ConfirmOptions = {
  warning?: boolean | { title: string };
  render: (opts: RenderArgs) => ReactNode;
};
export class DialogClient {
  private _manager: DialogManager.Api | null = null;

  private get manager() {
    if (!this._manager) throw new Error(`Must initialize the ${DialogClient.name} before use`);
    return this._manager;
  }

  public initialize(manager: DialogManager.Api | null) {
    this._manager = manager;
  }

  public confirm({ warning, render }: ConfirmOptions): Promise<boolean> {
    const { promise, resolve } = Promise.withResolvers<boolean>();
    const resolveConfirmation = (value: boolean) => {
      resolve(value);
      this.manager.remove({ token });
    };
    const children = render({
      resolve: resolveConfirmation,
      yesNoButtons: (options) => (
        <div className="mt-8 flex justify-end gap-4">
          <Button theme={options?.noTheme ?? "error"} onClick={() => resolveConfirmation(false)} className="px-6">
            {options?.noLabel ?? "No"}
          </Button>
          <Button theme={options?.yesTheme ?? "accent"} onClick={() => resolveConfirmation(true)} className="px-6">
            {options?.yesLabel ?? "Yes"}
          </Button>
        </div>
      ),
    });
    const { token } = this.manager.insert(
      <Modal isOpen className="p-5">
        {warning && (
          <div className="flex items-center gap-4 mb-8">
            <Icon variant="warning" className="size-7" />
            <h1 className="text-2xl">
              {typeof warning === "boolean" ? (
                <span className="text-c-warning">Warning</span>
              ) : (
                <>
                  <span className="text-c-warning">Warning: </span>
                  <span>{warning.title}</span>
                </>
              )}
            </h1>
          </div>
        )}
        {children}
      </Modal>,
    );
    return promise;
  }
}

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { type ReactElement, type ReactNode, type RefObject, useRef } from "react";

import { Button } from "./Button";

interface DialogAction { label: string; onClick: () => void }

interface ActionDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  primary: DialogAction;
  dismiss?: DialogAction | undefined;
  pendingLabel?: string | undefined;
  returnFocus?: RefObject<HTMLElement | null> | undefined;
}

export function ActionDialog({ open, title, description, primary, dismiss, pendingLabel, returnFocus }: ActionDialogProps): ReactElement {
  const heading = useRef<HTMLHeadingElement>(null);
  const dismissButton = useRef<HTMLElement>(null);

  return (
    <AlertDialog.Root open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen && pendingLabel === undefined) {
        dismiss?.onClick();
      }
    }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 bg-scrim layer-dialog" />
        <AlertDialog.Viewport className="fixed inset-0 grid overflow-y-auto p-lg layer-dialog">
          <AlertDialog.Popup initialFocus={dismiss ? dismissButton : heading} finalFocus={returnFocus} className="m-auto grid w-full min-w-0 max-w-form gap-lg rounded-panel border border-line bg-surface p-xl shadow-overlay">
            <div className="grid gap-xs">
              <AlertDialog.Title ref={heading} tabIndex={-1} className="text-heading font-semibold">{title}</AlertDialog.Title>
              <AlertDialog.Description className="text-body text-muted">{description}</AlertDialog.Description>
            </div>
            <div className="flex flex-wrap justify-end gap-sm">
              {dismiss && (
                <Button ref={dismissButton} variant="secondary" onClick={dismiss.onClick} disabled={pendingLabel !== undefined}>
                  {dismiss.label}
                </Button>
              )}
              <Button onClick={primary.onClick} pendingLabel={pendingLabel}>{primary.label}</Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

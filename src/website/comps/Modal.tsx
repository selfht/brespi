import { ReactNode, useEffect, useRef } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => unknown;
  children: ReactNode;
};

export function Modal({ isOpen, onClose, children }: Props) {
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;
    if (isOpen) {
      modalElement.showModal();
    } else {
      modalElement.close();
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    const modalElement = modalRef.current;
    if (modalElement && e.target === modalElement) {
      onClose();
    }
  };

  return (
    <dialog
      ref={modalRef}
      className="backdrop:bg-gray-800/50 backdrop:backdrop-blur-sm p-0 bg-white rounded-lg shadow-xl border border-blue-200 w-full max-w-2xl"
      onClick={handleBackdropClick}
      onClose={onClose}
      style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
    >
      <div className="p-10">{children}</div>
    </dialog>
  );
}

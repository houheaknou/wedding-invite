"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

const CloseContext = createContext<() => void>(() => {});
/** Lets content inside a Modal close it (e.g. after a successful save). */
export const useCloseModal = () => useContext(CloseContext);

export function Modal({
  trigger,
  triggerClassName,
  title,
  closeLabel,
  children,
}: {
  trigger: ReactNode;
  triggerClassName: string;
  title: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) close(); // backdrop click
        }}
        className="m-auto w-[calc(100%-1.5rem)] max-w-2xl rounded-3xl border border-brand-100 bg-white p-0 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button
            type="button"
            onClick={close}
            aria-label={closeLabel}
            className="inline-flex size-8 items-center justify-center rounded-full text-stone-500 hover:bg-brand-50 hover:text-brand-700"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">
          <CloseContext.Provider value={close}>{children}</CloseContext.Provider>
        </div>
      </dialog>
    </>
  );
}

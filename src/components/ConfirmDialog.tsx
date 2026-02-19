'use client';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <p className="text-[0.95rem] text-brand-charcoal mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            className="flex-1 py-3 rounded-xl border border-[#ddd] text-[#888] font-semibold text-[0.9rem] hover:bg-[#f5f5f5]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex-1 py-3 rounded-xl bg-brand-pink text-white font-bold text-[0.9rem] hover:bg-brand-pink-dark"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

import { toast } from "react-toastify";

export function showSuccess(message) {
  toast.success(message);
}

export function showError(message) {
  toast.error(message);
}

export function showInfo(message) {
  toast.info(message);
}

export function confirmAction({
  title = "Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
}) {
  return new Promise((resolve) => {
    const confirmClass =
      variant === "danger"
        ? "bg-red-600 hover:bg-red-700"
        : "bg-blue-600 hover:bg-blue-700";

    toast(
      ({ closeToast }) => (
        <div className="min-w-[260px]">
          <p className="font-semibold text-gray-900 text-sm">{title}</p>
          {message && (
            <p className="text-gray-600 text-sm mt-1 leading-relaxed">{message}</p>
          )}
          <div className="flex gap-2 mt-3 justify-end">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50"
              onClick={() => {
                resolve(false);
                closeToast();
              }}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg text-white text-xs font-medium ${confirmClass}`}
              onClick={() => {
                resolve(true);
                closeToast();
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
      },
    );
  });
}

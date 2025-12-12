"use client";

export default function TaskDetailsModal({ onClose, task, allocations }) {
  const statusColors = {
    completed: "bg-emerald-500",
    failed: "bg-rose-500",
    pending: "bg-amber-500",
    in_progress: "bg-blue-500",
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-8 rounded-full ${
                statusColors[task.status] || "bg-gray-400"
              }`}
            />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{task.name}</h2>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md">
                  {task.type}
                </span>
                <span>•</span>
                <span>Task ID: {task.id?.slice(0, 8)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 group"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Desktop: Task Overview Grid */}
            <div className="hidden md:grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    Status
                  </span>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${
                    task.status === "completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : task.status === "failed"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg
                      className="w-5 h-5 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    Scheduled Time
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {task.scheduled_at ? (
                    new Date(task.scheduled_at).toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  ) : (
                    <span className="text-gray-400">Not scheduled</span>
                  )}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    Senders
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {allocations.length}{" "}
                  <span className="text-sm font-normal text-gray-600">
                    sender{allocations.length !== 1 ? "s" : ""}
                  </span>
                </p>
              </div>
            </div>

            {/* Mobile: Single Block Layout */}
            <div className="md:hidden bg-gradient-to-br from-gray-50 to-white rounded-xl p-2 border border-gray-200">
              <div className="space-y-4">
                {/* Status Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600">
                        Status
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold capitalize mt-1 inline-block ${
                          task.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : task.status === "failed"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200"></div>

                {/* Scheduled Time Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600">
                        Scheduled Time
                      </div>
                      <div className="text-base font-semibold text-gray-900 mt-1">
                        {task.scheduled_at ? (
                          new Date(task.scheduled_at).toLocaleString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        ) : (
                          <span className="text-gray-400">Not scheduled</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200"></div>

                {/* Senders Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600">
                        Senders
                      </div>
                      <div className="text-base font-semibold text-gray-900 mt-1">
                        {allocations.length}{" "}
                        <span className="text-sm font-normal text-gray-600">
                          sender{allocations.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Allocations Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Allocation Details
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Distribution across sender accounts
                </p>
              </div>

              {allocations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">
                    No allocations found
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    This task hasn't been allocated to any senders yet
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50/50">
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <span>Sender</span>
                              </div>
                            </th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Account
                            </th>
                            <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Total
                            </th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Progress
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {allocations.map((a, index) => (
                            <tr
                              key={a.account_id}
                              className="hover:bg-gray-50/50 transition-colors duration-150"
                            >
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-semibold text-blue-700">
                                      {a.sender_name.charAt(0)}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-gray-900 truncate">
                                      {a.sender_name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      #{String(index + 1).padStart(2, "0")}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 max-w-[200px]">
                                <div className="text-gray-600 truncate">
                                  {a.email}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex justify-center">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                    <span className="text-sm font-bold text-white">
                                      {a.total}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="space-y-2">
                                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                                      style={{
                                        width: `${(a.sent / a.total) * 100}%`,
                                      }}
                                    />
                                  </div>
                                  <div className="grid grid-cols-4 gap-1 text-xs">
                                    <div className="text-center">
                                      <div className="font-semibold text-amber-600">
                                        {a.pending}
                                      </div>
                                      <div className="text-gray-500">
                                        Pending
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-blue-600">
                                        {a.scheduled}
                                      </div>
                                      <div className="text-gray-500">
                                        Scheduled
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-emerald-600">
                                        {a.sent}
                                      </div>
                                      <div className="text-gray-500">Sent</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-rose-600">
                                        {a.failed}
                                      </div>
                                      <div className="text-gray-500">
                                        Failed
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary Footer */}
                    <div className="border-t border-gray-200 bg-gray-50/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-700">
                          Total Allocations
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-xl font-bold text-gray-900">
                              {allocations.reduce((sum, a) => sum + a.total, 0)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Total Emails
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {["pending", "scheduled", "sent", "failed"].map(
                              (status) => (
                                <div key={status} className="text-center">
                                  <div className="text-sm font-semibold">
                                    {allocations.reduce(
                                      (sum, a) => sum + a[status],
                                      0
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 capitalize">
                                    {status}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {allocations.map((a, index) => (
                      <div
                        key={a.account_id}
                        className="p-4 hover:bg-gray-50/50 transition-colors duration-150"
                      >
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-semibold text-blue-700">
                                  {a.sender_name.charAt(0)}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-gray-900 truncate">
                                  {a.sender_name}
                                </h4>
                                <p className="text-sm text-gray-600 truncate">
                                  {a.email}
                                </p>
                              </div>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-white">
                                {a.total}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>
                                {Math.round((a.sent / a.total) * 100)}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                                style={{
                                  width: `${(a.sent / a.total) * 100}%`,
                                }}
                              />
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                              <div className="bg-amber-50 p-2 rounded-lg text-center">
                                <div className="font-semibold text-amber-700">
                                  {a.pending}
                                </div>
                                <div className="text-xs text-amber-600">
                                  Pending
                                </div>
                              </div>
                              <div className="bg-blue-50 p-2 rounded-lg text-center">
                                <div className="font-semibold text-blue-700">
                                  {a.scheduled}
                                </div>
                                <div className="text-xs text-blue-600">
                                  Scheduled
                                </div>
                              </div>
                              <div className="bg-emerald-50 p-2 rounded-lg text-center">
                                <div className="font-semibold text-emerald-700">
                                  {a.sent}
                                </div>
                                <div className="text-xs text-emerald-600">
                                  Sent
                                </div>
                              </div>
                              <div className="bg-rose-50 p-2 rounded-lg text-center">
                                <div className="font-semibold text-rose-700">
                                  {a.failed}
                                </div>
                                <div className="text-xs text-rose-600">
                                  Failed
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-6 border-t border-gray-100 bg-white">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 active:scale-95"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

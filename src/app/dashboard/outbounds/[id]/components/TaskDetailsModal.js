'use client'

export default function TaskDetailsModal({ onClose, task, allocations }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Task Details</h2>
            <p className="text-xs md:text-sm text-gray-500 mt-1">Complete overview of task and allocations</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8">
          {/* Task Info Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 md:p-6 border border-blue-100">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Task Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-2 md:space-y-3">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-500">Task Name</p>
                  <p className="text-base md:text-lg font-semibold text-gray-900 mt-1">{task.name}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-500">Type</p>
                  <span className="inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium bg-blue-100 text-blue-800 mt-1">
                    {task.type}
                  </span>
                </div>
              </div>
              <div className="space-y-2 md:space-y-3">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-500">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium mt-1 ${
                    task.status === 'completed' ? 'bg-green-100 text-green-800' :
                    task.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {task.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-500">Scheduled Time</p>
                  <p className="text-base md:text-lg font-medium text-gray-900 mt-1">
                    {task.scheduled_at
                      ? new Date(task.scheduled_at).toLocaleString()
                      : <span className="text-gray-400">Not scheduled</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Allocations Section */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Allocations</h3>
                <p className="text-xs md:text-sm text-gray-500 mt-1">Distribution across senders</p>
              </div>
              <div className="text-xs md:text-sm text-gray-500">
                {allocations.length} {allocations.length === 1 ? 'sender' : 'senders'}
              </div>
            </div>

            {allocations.length === 0 ? (
              <div className="text-center py-8 md:py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <svg className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="mt-3 md:mt-4 text-sm text-gray-500">No allocations found for this task</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Sender
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Status Breakdown
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {allocations.map((a) => (
                        <tr key={a.account_id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{a.sender_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-600">{a.email}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold">
                              {a.total}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="grid grid-cols-4 gap-2">
                              <div className="text-center">
                                <div className="text-lg font-semibold text-yellow-700">{a.pending}</div>
                                <div className="text-xs text-gray-500">Pending</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-blue-700">{a.scheduled}</div>
                                <div className="text-xs text-gray-500">Scheduled</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-green-700">{a.sent}</div>
                                <div className="text-xs text-gray-500">Sent</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-red-700">{a.failed}</div>
                                <div className="text-xs text-gray-500">Failed</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Summary Footer */}
                    {allocations.length > 0 && (
                      <tfoot className="bg-gray-50 border-t border-gray-200">
                        <tr>
                          <td colSpan={2} className="px-6 py-3 text-right font-semibold text-gray-700">
                            Totals:
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className="font-semibold text-gray-900">
                              {allocations.reduce((sum, a) => sum + a.total, 0)}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="grid grid-cols-4 gap-2">
                              {['pending', 'scheduled', 'sent', 'failed'].map((status) => (
                                <div key={status} className="text-center">
                                  <div className="font-semibold">
                                    {allocations.reduce((sum, a) => sum + a[status], 0)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-gray-200">
                  {allocations.map((a) => (
                    <div key={a.account_id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">{a.sender_name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{a.email}</p>
                          </div>
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm">
                            {a.total}
                          </span>
                        </div>
                        
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">Status Breakdown</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-yellow-50 p-3 rounded-lg">
                              <div className="text-lg font-semibold text-yellow-700 text-center">{a.pending}</div>
                              <div className="text-xs text-gray-600 text-center mt-1">Pending</div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <div className="text-lg font-semibold text-blue-700 text-center">{a.scheduled}</div>
                              <div className="text-xs text-gray-600 text-center mt-1">Scheduled</div>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg">
                              <div className="text-lg font-semibold text-green-700 text-center">{a.sent}</div>
                              <div className="text-xs text-gray-600 text-center mt-1">Sent</div>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg">
                              <div className="text-lg font-semibold text-red-700 text-center">{a.failed}</div>
                              <div className="text-xs text-gray-600 text-center mt-1">Failed</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Mobile Summary */}
                  {allocations.length > 0 && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-700">Totals:</span>
                          <span className="font-semibold text-gray-900">
                            {allocations.reduce((sum, a) => sum + a.total, 0)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {['pending', 'scheduled', 'sent', 'failed'].map((status) => (
                            <div key={status} className="text-center p-2 bg-white rounded border">
                              <div className="text-xs text-gray-500 mb-1 capitalize">{status}</div>
                              <div className="font-semibold">
                                {allocations.reduce((sum, a) => sum + a[status], 0)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 md:px-6 md:py-2 bg-gray-900 text-white text-sm md:text-base font-medium rounded-lg hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
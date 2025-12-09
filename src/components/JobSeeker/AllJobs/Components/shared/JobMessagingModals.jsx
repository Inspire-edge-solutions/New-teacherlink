import React from 'react';
import ModalPortal from '../../../../common/ModalPortal';

const WHATSAPP_COST = 20;
const RCS_COST = 10;

const JobMessagingModals = ({
  showApplyPrompt,
  jobToApplyPrompt,
  onApplyPromptClose,
  onApplyPromptApply,

  showMessageModal,
  jobToMessage,
  onMessageModalOk,
  onMessageModalContinue,

  showBulkMessageModal,
  bulkChannel,
  bulkMessage,
  bulkMessageChars,
  coinBalance,
  selectedCount,
  bulkError,
  onChannelSelect,
  onBulkMessageChange,
  onCloseBulkMessageModal,
  onPrepareBulkSend,

  showConfirmModal,
  bulkSummary,
  isSendingBulk,
  onCancelConfirmation,
  onConfirmSend,

  showInsufficientCoinsModal,
  requiredCoins,
  onCloseInsufficientCoinsModal,
  onRechargeNavigate
}) => {
  return (
    <>
      {/* Apply Prompt Modal */}
      {showApplyPrompt && jobToApplyPrompt && (
        <ModalPortal>
          <div
            className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
            onClick={onApplyPromptClose}
          >
            <div
              className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
                onClick={onApplyPromptClose}
              >
                &times;
              </button>

              <div className="mb-4 mt-0.5 text-center">
                <h3 className="font-semibold text-xl mb-4 text-gray-800 leading-tight tracking-tight">
                  Apply To Message
                </h3>
                <p className="text-gray-600 text-base leading-relaxed tracking-tight mb-3">
                  To message the institute about the job titled - <strong>{jobToApplyPrompt.job_title || jobToApplyPrompt.title || 'this job'}</strong>, please apply to the job first to unlock messaging.
                </p>
                <div className="bg-white/60 rounded-lg p-3 mb-3 border border-gray-200">
                  <p className="text-gray-700 text-sm font-medium leading-relaxed">
                    <span className="inline-flex items-center gap-1">
                      <span role="img" aria-label="coin" className="text-base">🪙</span>
                      <strong className="text-base">110 Coins</strong> will be deducted
                    </span>
                    <br />
                    <span className="text-xs text-gray-600 mt-1 block">
                      (100 coins for job application + 10 coins for messaging unlock)
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md leading-normal tracking-tight"
                  onClick={onApplyPromptClose}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl leading-normal tracking-tight flex items-center justify-center gap-1.5"
                  onClick={() => {
                    if (typeof onApplyPromptApply === 'function') {
                      onApplyPromptApply();
                    } else {
                      onApplyPromptClose();
                    }
                  }}
                >
                  Apply Job <span className="text-sm">🪙 110</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Message Modal */}
      {showMessageModal && jobToMessage && (
        <ModalPortal>
          <div
            className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
            onClick={onMessageModalOk}
          >
            <div
              className="bg-white rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
                onClick={onMessageModalOk}
              >
                &times;
              </button>

              <div className="mb-4 mt-0.5">
                <h3 className="font-semibold text-xl mb-4 text-center text-gray-800 leading-tight tracking-tight">
                  Message Institute
                </h3>
                <p className="text-gray-600 text-base mb-6 text-center leading-relaxed tracking-tight">
                  To send a bulk message, select multiple jobs using the checkboxes and click <strong>Send Message</strong>. Choose <strong>Continue Single</strong> below to message just this institute.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md leading-normal tracking-tight"
                  onClick={onMessageModalOk}
                >
                  Ok
                </button>
                <button
                  className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl leading-normal tracking-tight"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMessageModalContinue) {
                      onMessageModalContinue();
                    }
                  }}
                >
                  Continue Single
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Bulk Message Modal */}
      {showBulkMessageModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
            onClick={onCloseBulkMessageModal}
          >
            <div
              className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
              onClick={onCloseBulkMessageModal}
            >
              &times;
            </button>

            <div className="mb-4 mt-0.5 text-center">
              <h3 className="font-semibold text-xl mb-4 text-gray-800 leading-tight tracking-tight">
                Send Bulk Message
              </h3>
              <div className="text-gray-600 text-base leading-relaxed space-y-1 tracking-tight">
                <p>
                  <strong>{WHATSAPP_COST} coins</strong> per institute via WhatsApp
                </p>
                <p>
                  <strong>{RCS_COST} coins</strong> per institute via RCS
                </p>
                {coinBalance !== null && (
                  <p className="text-base text-gray-500 mt-2 leading-normal tracking-tight">
                    Current balance: <strong>{coinBalance}</strong> coins
                  </p>
                )}
                <p className="text-base text-gray-600 mt-2 leading-normal tracking-tight">
                  Coins will be deducted after admin approval
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                className={`flex-1 px-6 py-3 border rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md leading-normal tracking-tight ${bulkChannel === 'whatsapp' ? 'bg-[#25D366] text-white border-[#25D366]' : 'bg-white text-[#25D366] border-[#25D366]'}`}
                onClick={() => onChannelSelect('whatsapp')}
              >
                Through WhatsApp
              </button>
              <button
                className={`flex-1 px-6 py-3 border rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md leading-normal tracking-tight ${bulkChannel === 'rcs' ? 'bg-[#0a84ff] text-white border-[#0a84ff]' : 'bg-white text-[#0a84ff] border-[#0a84ff]'}`}
                onClick={() => onChannelSelect('rcs')}
              >
                Through RCS
              </button>
            </div>

            {bulkChannel && (
              <div className="space-y-3">
                <textarea
                  value={bulkMessage}
                  onChange={onBulkMessageChange}
                  maxLength={500}
                  rows={5}
                  placeholder="Enter your message here..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-base focus:outline-none focus:ring-2 focus:ring-gradient-brand resize-none leading-normal tracking-tight"
                />
                <div className="flex items-center justify-between text-base text-gray-500 leading-normal tracking-tight">
                  <span>{selectedCount} job{selectedCount !== 1 ? 's' : ''} selected</span>
                  <span>{bulkMessageChars}/500</span>
                </div>
              </div>
            )}

            {bulkError && (
              <div className="mt-3 text-base text-red-500 text-left leading-normal tracking-tight">
                {bulkError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={onCloseBulkMessageModal}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onPrepareBulkSend}
                disabled={!bulkChannel || bulkMessageChars === 0}
              >
                Review &amp; Send
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Bulk Message Confirmation Modal */}
      {showConfirmModal && bulkSummary && (
        <ModalPortal>
          <div
            className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
            onClick={onCancelConfirmation}
          >
            <div
              className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-lg relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
              onClick={onCancelConfirmation}
              disabled={isSendingBulk}
            >
              &times;
            </button>

            <div className="mb-4 mt-0.5 text-center space-y-2">
              <h3 className="font-semibold text-xl text-gray-800 leading-tight tracking-tight">
                Confirm &amp; Submit for Approval
              </h3>
              <p className="text-gray-600 text-base leading-relaxed tracking-tight">
                You are about to submit a <strong>{bulkSummary.channel === 'whatsapp' ? 'WhatsApp' : 'RCS'}</strong> message request to <strong>{bulkSummary.jobs.length}</strong> institute{bulkSummary.jobs.length !== 1 ? 's' : ''} for admin approval.
              </p>
              <p className="text-gray-600 text-base leading-relaxed tracking-tight">
                Your message will be reviewed by admin before being sent.
              </p>
            </div>

            <div className="mb-4 space-y-2 max-h-60 overflow-y-auto">
              {bulkSummary.jobs.map(({ job, institute }) => (
                <div key={institute?.id || job.id} className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="font-semibold text-base text-gray-800 leading-normal tracking-tight">
                    {institute?.name || job.institute_name || 'Institute'}
                  </div>
                  <div className="text-base text-gray-500 leading-normal tracking-tight">
                    {job.job_title || job.title || 'Job role'}
                  </div>
                  <div className="text-base text-gray-500 leading-normal tracking-tight">
                    {institute?.city || job.city || 'City not available'}{institute?.state || job.state_ut ? `, ${institute?.state || job.state_ut}` : ''}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4 p-3 bg-gray-50 border border-gray-100 rounded-lg text-left text-base text-gray-700 whitespace-pre-line leading-normal tracking-tight">
              {bulkSummary.message}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                onClick={onCancelConfirmation}
                disabled={isSendingBulk}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onConfirmSend}
                disabled={isSendingBulk}
              >
                {isSendingBulk ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Submitting...
                  </span>
                ) : (
                  'Submit for Approval'
                )}
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Insufficient Coins Modal */}
      {showInsufficientCoinsModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
            onClick={onCloseInsufficientCoinsModal}
          >
            <div
              className="bg-white rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
                onClick={onCloseInsufficientCoinsModal}
              >
                &times;
              </button>

              <div className="mb-4 mt-0.5 text-center space-y-3">
                <h3 className="font-semibold text-xl text-gray-800 leading-tight tracking-tight">
                  Insufficient Coins
                </h3>
                <p className="text-gray-600 text-base leading-relaxed tracking-tight">
                  You need <strong>{requiredCoins}</strong> coins to send this bulk message.
                </p>
                <p className="text-gray-600 text-base leading-relaxed tracking-tight">
                  Current balance: <strong>{coinBalance ?? 0}</strong> coins. You are short by <strong>{Math.max(requiredCoins - (coinBalance ?? 0), 0)}</strong> coins.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md leading-normal tracking-tight"
                  onClick={onCloseInsufficientCoinsModal}
                >
                  Close
                </button>
                <button
                  className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl leading-normal tracking-tight"
                  onClick={onRechargeNavigate}
                >
                  Recharge Now
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
};

export default JobMessagingModals;
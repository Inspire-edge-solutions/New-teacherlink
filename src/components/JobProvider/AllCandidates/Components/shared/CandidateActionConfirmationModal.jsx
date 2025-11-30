import React from 'react';
import ModalPortal from '../../../../common/ModalPortal';

/**
 * Shared CandidateActionConfirmationModal component
 * Used across all candidate sections when adding a candidate to favorites
 */
const CandidateActionConfirmationModal = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 w-full h-screen bg-black/65 flex items-center justify-center z-[1050] animate-fadeIn overflow-y-auto p-5"
        onClick={onCancel}
      >
        <div
          className="bg-[#F0D8D9] rounded-2xl p-8 w-[90%] max-w-md relative shadow-2xl animate-slideUp my-auto max-h-[calc(100vh-40px)] overflow-y-auto overscroll-contain"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute top-4 right-4 bg-transparent border-none text-2xl text-gray-600 cursor-pointer p-1.5 leading-none hover:text-gray-900 hover:scale-110 transition-all"
            onClick={onCancel}
          >
            &times;
          </button>

          <div className="mb-4 mt-0.5 text-center">
            <h3 className="font-semibold text-xl mb-4 text-gray-800 leading-tight tracking-tight">
              Add to Favourites
            </h3>
            <p 
              className="text-gray-600 text-lg sm:text-base leading-normal tracking-tight"
              dangerouslySetInnerHTML={{ __html: `When you add candidates as favourites, you'll receive an instant status alert when the candidate changes their job status to "Actively Searching Jobs". A fee of <strong>20 coins per notification</strong> will apply.` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className="flex-1 px-6 py-3 bg-gray-400 hover:bg-gray-300 text-gray-800 border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md leading-normal tracking-tight"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="flex-1 px-6 py-3 bg-gradient-brand text-white border-none rounded-lg font-semibold text-base cursor-pointer duration-300 transition-colors shadow-lg hover:bg-gradient-primary-hover hover:shadow-xl leading-normal tracking-tight"
              onClick={onConfirm}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CandidateActionConfirmationModal;


import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import JobApiService from '../shared/JobApiService';

const WHATSAPP_COST = 20;
const RCS_COST = 10;

const useJobMessaging = ({
  user,
  filteredJobs,
  currentJobs,
  getJobId,
  isJobApplied,
  onViewJob,
  onApplyJob
}) => {
  const navigate = useNavigate();

  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [jobToMessage, setJobToMessage] = useState(null);

  const [showApplyPrompt, setShowApplyPrompt] = useState(false);
  const [jobToApplyPrompt, setJobToApplyPrompt] = useState(null);

  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [bulkChannel, setBulkChannel] = useState(null);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkMessageChars, setBulkMessageChars] = useState(0);
  const [bulkError, setBulkError] = useState('');
  const [coinBalance, setCoinBalance] = useState(null);
  const [bulkSummary, setBulkSummary] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [showInsufficientCoinsModal, setShowInsufficientCoinsModal] = useState(false);
  const [requiredCoins, setRequiredCoins] = useState(0);

  const userProfileRef = useRef(null);

  const buildInstituteData = useCallback((job) => {
    if (!job) return null;
    const id = getJobId(job);
    return {
      id,
      firebase_uid: job.firebase_uid,
      name: job.institute_name || job.school_name || job.organization_name || job.organisation_name || 'Institute',
      city: job.city || job.city_name || job.location || null,
      state: job.state_ut || job.state || job.state_name || null,
      jobTitle: job.job_title || job.title || 'Job Opportunity',
      job
    };
  }, [getJobId]);

  const resetBulkForm = useCallback(() => {
    setBulkChannel(null);
    setBulkMessage('');
    setBulkMessageChars(0);
    setBulkError('');
    setBulkSummary(null);
    setIsSendingBulk(false);
  }, []);

  const handleCheckboxChange = useCallback((job) => {
    const jobId = String(getJobId(job));
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, [getJobId]);

  const handleSelectAll = useCallback(() => {
    if (!Array.isArray(currentJobs) || currentJobs.length === 0) {
      setSelectAll(false);
      return;
    }
    setSelectAll((prev) => {
      const nextSelectAll = !prev;
      setSelectedJobs((prevSelected) => {
        const next = new Set(prevSelected);
        currentJobs.forEach((job) => {
          const jobId = String(getJobId(job));
          if (nextSelectAll) {
            next.add(jobId);
          } else {
            next.delete(jobId);
          }
        });
        return next;
      });
      return nextSelectAll;
    });
  }, [currentJobs, getJobId]);

  useEffect(() => {
    setSelectedJobs(new Set());
    setSelectAll(false);
  }, [filteredJobs]);

  useEffect(() => {
    if (!Array.isArray(currentJobs) || currentJobs.length === 0) {
      setSelectAll(false);
      return;
    }
    const pageIds = new Set(currentJobs.map((job) => String(getJobId(job))));
    const selectedOnPage = Array.from(selectedJobs).filter((id) => pageIds.has(id));
    setSelectAll(pageIds.size > 0 && selectedOnPage.length === pageIds.size);
  }, [currentJobs, selectedJobs, getJobId]);

  const handleMessage = useCallback((job) => {
    if (!user) {
      toast.error('Please login to message institutes.');
      return;
    }
    const applied = isJobApplied ? isJobApplied(job) : false;
    if (!applied) {
      setJobToApplyPrompt(job);
      setShowApplyPrompt(true);
      return;
    }

    const institute = buildInstituteData(job);
    setJobToMessage({ job, institute });
    setShowMessageModal(true);
  }, [buildInstituteData, isJobApplied, user]);

  const handleMessageModalOk = useCallback(() => {
    setShowMessageModal(false);
    setJobToMessage(null);
  }, []);

  const handleMessageModalContinue = useCallback(() => {
    if (jobToMessage?.institute) {
      navigate('/seeker/messages', {
        state: {
          selectedInstitute: {
            firebase_uid: jobToMessage.institute.firebase_uid,
            name: jobToMessage.institute.name,
            city: jobToMessage.institute.city,
            state: jobToMessage.institute.state
          },
          startConversation: true
        },
        replace: false
      });
    }
    setShowMessageModal(false);
    setJobToMessage(null);
  }, [jobToMessage, navigate]);

  const handleApplyPromptClose = useCallback(() => {
    setShowApplyPrompt(false);
    setJobToApplyPrompt(null);
  }, []);

  const handleApplyPromptApplyJob = useCallback(() => {
    if (jobToApplyPrompt) {
      if (typeof onApplyJob === 'function') {
        onApplyJob(jobToApplyPrompt);
      } else if (typeof onViewJob === 'function') {
        onViewJob(jobToApplyPrompt);
      }
    }
    setShowApplyPrompt(false);
    setJobToApplyPrompt(null);
  }, [jobToApplyPrompt, onApplyJob, onViewJob]);

  const getSelectedRecords = useCallback(() => {
    if (!Array.isArray(filteredJobs) || filteredJobs.length === 0) {
      return [];
    }
    return filteredJobs.filter((job) => selectedJobs.has(String(getJobId(job))));
  }, [filteredJobs, selectedJobs, getJobId]);

  const handleOpenBulkMessageModal = useCallback(() => {
    if (!user) {
      toast.error('Please login to send messages.');
      return;
    }
    if (selectedJobs.size === 0) {
      toast.info('Select at least one job to send a message.');
      return;
    }
    const selectedRecords = getSelectedRecords();
    const notApplied = selectedRecords.filter((job) => !(isJobApplied ? isJobApplied(job) : false));
    if (notApplied.length > 0) {
      toast.error('You can only message institutes for jobs you have applied to.');
      return;
    }
    resetBulkForm();
    setShowBulkMessageModal(true);
  }, [getSelectedRecords, isJobApplied, resetBulkForm, selectedJobs.size, user]);

  const handleCloseBulkMessageModal = useCallback(() => {
    setShowBulkMessageModal(false);
    resetBulkForm();
  }, [resetBulkForm]);

  const handleChannelSelect = useCallback((channel) => {
    setBulkChannel(channel);
    setBulkError('');
  }, []);

  const handleBulkMessageChange = useCallback((event) => {
    const value = event.target.value || '';
    if (value.length <= 500) {
      setBulkMessage(value);
      setBulkMessageChars(value.length);
    } else {
      const trimmed = value.slice(0, 500);
      setBulkMessage(trimmed);
      setBulkMessageChars(500);
    }
  }, []);

  useEffect(() => {
    if (!showBulkMessageModal) return;

    (async () => {
      try {
        const coins = await JobApiService.getUserCoins(user);
        setCoinBalance(coins);
        const profile = await JobApiService.getUserMessagingProfile(user);
        userProfileRef.current = profile;
      } catch (error) {
        console.error('Error preparing bulk messaging modal:', error);
      }
    })();
  }, [showBulkMessageModal, user]);

  const handlePrepareBulkSend = useCallback(() => {
    if (!bulkChannel) {
      setBulkError('Choose a channel to continue.');
      return;
    }
    const trimmedMessage = bulkMessage.trim();
    if (!trimmedMessage) {
      setBulkError('Enter a message to send.');
      return;
    }
    const selectedRecords = getSelectedRecords();
    if (selectedRecords.length === 0) {
      setBulkError('Could not find the selected jobs.');
      return;
    }
    const costPerInstitute = bulkChannel === 'whatsapp' ? WHATSAPP_COST : RCS_COST;
    const totalCost = costPerInstitute * selectedRecords.length;
    if (coinBalance === null) {
      setBulkError('Fetching coin balance. Please try again in a moment.');
      return;
    }
    if (coinBalance < totalCost) {
      setRequiredCoins(totalCost);
      resetBulkForm();
      setShowBulkMessageModal(false);
      setShowInsufficientCoinsModal(true);
      return;
    }

    const summaryJobs = selectedRecords.map((job) => {
      const institute = buildInstituteData(job);
      return {
        job,
        institute
      };
    });

    setBulkSummary({
      channel: bulkChannel,
      message: trimmedMessage,
      jobs: summaryJobs,
      costPerInstitute,
      totalCost
    });
    setShowConfirmModal(true);
    setShowBulkMessageModal(false);
  }, [bulkChannel, bulkMessage, coinBalance, getSelectedRecords, buildInstituteData, resetBulkForm]);

  const handleCancelConfirmation = useCallback(() => {
    setShowConfirmModal(false);
    if (bulkSummary) {
      setBulkChannel(bulkSummary.channel);
      setBulkMessage(bulkSummary.message);
      setBulkMessageChars(bulkSummary.message.length);
      setBulkSummary(null);
      setBulkError('');
      setShowBulkMessageModal(true);
    } else {
      resetBulkForm();
    }
  }, [bulkSummary, resetBulkForm]);

  const handleConfirmSend = useCallback(async () => {
    if (!bulkSummary || !user) return;
    setIsSendingBulk(true);
    try {
      let successCount = 0;
      const failedJobs = [];

      for (const entry of bulkSummary.jobs) {
        try {
          if (bulkSummary.channel === 'whatsapp') {
            await JobApiService.sendWhatsAppMessageToInstitute(entry.job, user, bulkSummary.message);
          } else {
            await JobApiService.sendRCSMessageToInstitute(entry.job, user, bulkSummary.message);
          }
          successCount += 1;
        } catch (error) {
          failedJobs.push({ job: entry.job, reason: error?.message || 'API error' });
        }
      }

      if (successCount > 0) {
        const totalCost = bulkSummary.totalCost;
        const newBalance = Math.max((coinBalance ?? 0) - totalCost, 0);
        try {
          await JobApiService.updateUserCoins(user, newBalance);
          const refreshed = await JobApiService.getUserCoins(user);
          setCoinBalance(refreshed);
          toast.success(`Sent ${successCount} ${bulkSummary.channel === 'whatsapp' ? 'WhatsApp' : 'RCS'} message${successCount > 1 ? 's' : ''}. Deducted ${totalCost} coin${totalCost !== 1 ? 's' : ''}.`);
        } catch (coinError) {
          console.error('Failed to update coins after messaging:', coinError);
          toast.error('Messages sent but coin balance could not be updated. Please verify your balance.');
        }
      }

      if (failedJobs.length > 0) {
        failedJobs.forEach(({ job, reason }) => {
          console.error('Messaging failed for job:', {
            jobId: job?.id,
            jobTitle: job?.job_title,
            reason
          });
        });

        const firstReason = failedJobs[0]?.reason ? ` Reason: ${failedJobs[0].reason}` : '';
        toast.error(`${failedJobs.length} message${failedJobs.length > 1 ? 's' : ''} failed to send.${firstReason}`);
      }
    } catch (error) {
      console.error('Error sending bulk messages:', error);
      toast.error('Failed to send messages. Please try again.');
    } finally {
      setIsSendingBulk(false);
      setShowConfirmModal(false);
      setBulkSummary(null);
      resetBulkForm();
      setSelectedJobs(new Set());
      setSelectAll(false);
    }
  }, [bulkSummary, coinBalance, resetBulkForm, user]);

  const handleCloseInsufficientCoinsModal = useCallback(() => {
    setShowInsufficientCoinsModal(false);
    setRequiredCoins(0);
  }, []);

  const handleRechargeNavigate = useCallback(() => {
    setShowInsufficientCoinsModal(false);
    navigate('/seeker/my-account');
  }, [navigate]);

  return {
    // Selection
    selectedJobs,
    selectAll,
    handleCheckboxChange,
    handleSelectAll,

    // Single message
    showMessageModal,
    jobToMessage,
    handleMessage,
    handleMessageModalOk,
    handleMessageModalContinue,

    // Apply prompt
    showApplyPrompt,
    jobToApplyPrompt,
    handleApplyPromptClose,
    handleApplyPromptApplyJob,
    handleApplyPromptApply: handleApplyPromptApplyJob,

    // Bulk modal
    showBulkMessageModal,
    handleOpenBulkMessageModal,
    handleCloseBulkMessageModal,
    bulkChannel,
    bulkMessage,
    bulkMessageChars,
    bulkError,
    coinBalance,
    handleChannelSelect,
    handleBulkMessageChange,
    handlePrepareBulkSend,

    // Confirmation modal
    showConfirmModal,
    bulkSummary,
    handleCancelConfirmation,
    handleConfirmSend,
    isSendingBulk,

    // Insufficient coins modal
    showInsufficientCoinsModal,
    requiredCoins,
    handleCloseInsufficientCoinsModal,
    handleRechargeNavigate
  };
};

export default useJobMessaging;
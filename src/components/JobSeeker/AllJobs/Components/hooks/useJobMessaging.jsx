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
  const previousFilteredJobsRef = useRef(null);
  const getJobIdRef = useRef(getJobId);
  const previousCurrentJobsRef = useRef(null);
  const previousSelectedJobsRef = useRef('');
  
  // Update ref when getJobId changes
  useEffect(() => {
    getJobIdRef.current = getJobId;
  }, [getJobId]);

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

  // Only reset selectedJobs when the actual job list changes (by comparing job IDs)
  useEffect(() => {
    if (!Array.isArray(filteredJobs)) {
      return;
    }
    
    // Create a stable identifier for the current filtered jobs list
    const currentJobIds = filteredJobs
      .map(job => String(getJobIdRef.current(job)))
      .sort()
      .join(',');
    
    const previousJobIds = previousFilteredJobsRef.current;
    
    // Only reset if the job IDs actually changed
    if (previousJobIds !== currentJobIds) {
      previousFilteredJobsRef.current = currentJobIds;
      setSelectedJobs(new Set());
      setSelectAll(false);
    }
  }, [filteredJobs]);

  useEffect(() => {
    if (!Array.isArray(currentJobs) || currentJobs.length === 0) {
      setSelectAll(false);
      previousCurrentJobsRef.current = null;
      previousSelectedJobsRef.current = '';
      return;
    }
    
    // Create stable identifiers for comparison
    const currentJobsIds = currentJobs
      .map((job) => String(getJobIdRef.current(job)))
      .sort()
      .join(',');
    const selectedJobsIds = Array.from(selectedJobs).sort().join(',');
    
    // Only update if something actually changed
    const jobsChanged = previousCurrentJobsRef.current !== currentJobsIds;
    const selectedChanged = previousSelectedJobsRef.current !== selectedJobsIds;
    
    if (jobsChanged || selectedChanged) {
      previousCurrentJobsRef.current = currentJobsIds;
      previousSelectedJobsRef.current = selectedJobsIds;
      
      const pageIds = new Set(currentJobs.map((job) => String(getJobIdRef.current(job))));
      const selectedOnPage = Array.from(selectedJobs).filter((id) => pageIds.has(id));
      const newSelectAll = pageIds.size > 0 && selectedOnPage.length === pageIds.size;
      
      // Only update if the value actually changed
      setSelectAll((prev) => prev !== newSelectAll ? newSelectAll : prev);
    }
  }, [currentJobs, selectedJobs]);

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

  const handleMessageModalContinue = useCallback(async () => {
    // Ensure we have jobToMessage
    if (!jobToMessage) {
      toast.error('Unable to open chat. Please try again.');
      setShowMessageModal(false);
      return;
    }
    
    // Determine the institute firebase_uid
    let instituteFirebaseUid = null;
    
    if (jobToMessage.institute?.firebase_uid) {
      instituteFirebaseUid = jobToMessage.institute.firebase_uid;
    } else if (jobToMessage.job?.firebase_uid) {
      instituteFirebaseUid = jobToMessage.job.firebase_uid;
    }
    
    if (!instituteFirebaseUid) {
      toast.error('Unable to open chat for this institute right now. Please try again later.');
      setShowMessageModal(false);
      setJobToMessage(null);
      return;
    }
    
    // Fetch organisation details from API using firebase_uid (like job provider side)
    let instituteName = 'Institute';
    let instituteCity = null;
    let instituteState = null;
    
    try {
      const organisationDetails = await JobApiService.fetchOrganisationDetails(instituteFirebaseUid);
      
      if (organisationDetails) {
        // Extract name with multiple fallbacks (similar to AllCandidates.jsx)
        instituteName = organisationDetails.organisation_name ||
                       organisationDetails.organization_name ||
                       organisationDetails.school_name ||
                       organisationDetails.name ||
                       organisationDetails.institute_name ||
                       jobToMessage.institute?.name ||
                       jobToMessage.job?.institute_name ||
                       jobToMessage.job?.school_name ||
                       jobToMessage.job?.organization_name ||
                       jobToMessage.job?.organisation_name ||
                       'Institute';
        
        // Extract city and state
        instituteCity = organisationDetails.city ||
                        organisationDetails.city_name ||
                        organisationDetails.present_city_name ||
                        jobToMessage.institute?.city ||
                        jobToMessage.job?.city ||
                        jobToMessage.job?.city_name ||
                        jobToMessage.job?.location ||
                        null;
        
        instituteState = organisationDetails.state ||
                         organisationDetails.state_ut ||
                         organisationDetails.present_state_name ||
                         jobToMessage.institute?.state ||
                         jobToMessage.job?.state_ut ||
                         jobToMessage.job?.state ||
                         jobToMessage.job?.state_name ||
                         null;
      } else {
        // Fallback to job object if API fetch fails
        instituteName = jobToMessage.institute?.name ||
                        jobToMessage.job?.institute_name ||
                        jobToMessage.job?.school_name ||
                        jobToMessage.job?.organization_name ||
                        jobToMessage.job?.organisation_name ||
                        'Institute';
        instituteCity = jobToMessage.institute?.city ||
                       jobToMessage.job?.city ||
                       jobToMessage.job?.city_name ||
                       jobToMessage.job?.location ||
                       null;
        instituteState = jobToMessage.institute?.state ||
                         jobToMessage.job?.state_ut ||
                         jobToMessage.job?.state ||
                         jobToMessage.job?.state_name ||
                         null;
      }
    } catch (error) {
      console.error('Error fetching organisation details:', error);
      // Fallback to job object if API fetch fails
      instituteName = jobToMessage.institute?.name ||
                      jobToMessage.job?.institute_name ||
                      jobToMessage.job?.school_name ||
                      jobToMessage.job?.organization_name ||
                      jobToMessage.job?.organisation_name ||
                      'Institute';
      instituteCity = jobToMessage.institute?.city ||
                     jobToMessage.job?.city ||
                     jobToMessage.job?.city_name ||
                     jobToMessage.job?.location ||
                     null;
      instituteState = jobToMessage.institute?.state ||
                      jobToMessage.job?.state_ut ||
                      jobToMessage.job?.state ||
                      jobToMessage.job?.state_name ||
                      null;
    }
    
    const selectedInstitute = {
      firebase_uid: instituteFirebaseUid,
      name: instituteName,
      city: instituteCity,
      state: instituteState,
    };
    
    // Navigate first, then close modal
    try {
      navigate('/seeker/messages', {
        state: {
          selectedInstitute: selectedInstitute,
          startConversation: true,
        },
        replace: false,
      });
      
      // Close modal after navigation is initiated
      setShowMessageModal(false);
      setJobToMessage(null);
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('Failed to navigate to messages. Please try again.');
      setShowMessageModal(false);
      setJobToMessage(null);
    }
  }, [jobToMessage, navigate]);

  const handleApplyPromptClose = useCallback(() => {
    setShowApplyPrompt(false);
    setJobToApplyPrompt(null);
  }, []);

  const handleApplyPromptApplyJob = useCallback(async () => {
    if (!jobToApplyPrompt || !user) {
      setShowApplyPrompt(false);
      setJobToApplyPrompt(null);
      return;
    }

    try {
      // Apply directly with messaging unlock (110 coins: 100 for apply + 10 for messaging)
      const result = await JobApiService.applyForJob(jobToApplyPrompt, user, 100, true);
      
      if (result.status === "success") {
        toast.success("Successfully applied and unlocked messaging!");
        
        // Send WhatsApp notification
        try {
          await JobApiService.sendWhatsAppToInstitution(jobToApplyPrompt, user);
        } catch (whatsappError) {
          console.error('Failed to send WhatsApp notification:', whatsappError);
        }
        
        // Refresh applied jobs list if callback exists (to update button state)
        if (typeof onApplyJob === 'function') {
          onApplyJob(jobToApplyPrompt);
        }
        
        // Build institute data for messaging navigation
        const institute = buildInstituteData(jobToApplyPrompt);
        let instituteFirebaseUid = institute?.firebase_uid || jobToApplyPrompt?.firebase_uid;
        
        if (!instituteFirebaseUid) {
          toast.error('Unable to open chat. Please try again later.');
          setShowApplyPrompt(false);
          setJobToApplyPrompt(null);
          return;
        }
        
        // Fetch organisation details and navigate to messages
        try {
          let instituteName = 'Institute';
          let instituteCity = null;
          let instituteState = null;
          
          const organisationDetails = await JobApiService.fetchOrganisationDetails(instituteFirebaseUid);
          
          if (organisationDetails) {
            instituteName = organisationDetails.organisation_name ||
                           organisationDetails.organization_name ||
                           organisationDetails.school_name ||
                           organisationDetails.name ||
                           organisationDetails.institute_name ||
                           institute?.name ||
                           jobToApplyPrompt?.institute_name ||
                           jobToApplyPrompt?.school_name ||
                           jobToApplyPrompt?.organization_name ||
                           jobToApplyPrompt?.organisation_name ||
                           'Institute';
            
            instituteCity = organisationDetails.city ||
                           organisationDetails.city_name ||
                           organisationDetails.present_city_name ||
                           institute?.city ||
                           jobToApplyPrompt?.city ||
                           jobToApplyPrompt?.city_name ||
                           jobToApplyPrompt?.location ||
                           null;
            
            instituteState = organisationDetails.state ||
                            organisationDetails.state_ut ||
                            organisationDetails.present_state_name ||
                            institute?.state ||
                            jobToApplyPrompt?.state_ut ||
                            jobToApplyPrompt?.state ||
                            jobToApplyPrompt?.state_name ||
                            null;
          } else {
            // Fallback to job object
            instituteName = institute?.name ||
                           jobToApplyPrompt?.institute_name ||
                           jobToApplyPrompt?.school_name ||
                           jobToApplyPrompt?.organization_name ||
                           jobToApplyPrompt?.organisation_name ||
                           'Institute';
            instituteCity = institute?.city ||
                           jobToApplyPrompt?.city ||
                           jobToApplyPrompt?.city_name ||
                           jobToApplyPrompt?.location ||
                           null;
            instituteState = institute?.state ||
                            jobToApplyPrompt?.state_ut ||
                            jobToApplyPrompt?.state ||
                            jobToApplyPrompt?.state_name ||
                            null;
          }
          
          const selectedInstitute = {
            firebase_uid: instituteFirebaseUid,
            name: instituteName,
            city: instituteCity,
            state: instituteState,
          };
          
          // Close modal first
          setShowApplyPrompt(false);
          setJobToApplyPrompt(null);
          
          // Navigate to messages section
          navigate('/seeker/messages', {
            state: {
              selectedInstitute: selectedInstitute,
              startConversation: true,
            },
            replace: false,
          });
        } catch (navError) {
          console.error('Error navigating to messages:', navError);
          toast.error('Applied successfully! You can now message the institute.');
          setShowApplyPrompt(false);
          setJobToApplyPrompt(null);
        }
      } else if (result.status === "already") {
        toast.info("You have already applied for this job.");
        setShowApplyPrompt(false);
        setJobToApplyPrompt(null);
      } else {
        toast.error(result.message || "Failed to apply for the job.");
        setShowApplyPrompt(false);
        setJobToApplyPrompt(null);
      }
    } catch (error) {
      console.error('Error applying for job with messaging unlock:', error);
      toast.error(error.message || "Failed to apply for the job.");
      setShowApplyPrompt(false);
      setJobToApplyPrompt(null);
    }
  }, [jobToApplyPrompt, user, onApplyJob, buildInstituteData, navigate]);

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
    // Bulk messaging doesn't require jobs to be applied - allow sending to all selected jobs
    resetBulkForm();
    setShowBulkMessageModal(true);
  }, [resetBulkForm, selectedJobs.size, user]);

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

    // No coin balance check needed - submitting for admin approval, not sending directly
    const summaryJobs = selectedRecords.map((job) => {
      const institute = buildInstituteData(job);
      
      // Debug: Log the structure to see what we have
      console.log('📋 Building summary for job:', {
        jobId: job.id,
        jobTitle: job.job_title,
        jobFirebaseUid: job.firebase_uid,
        instituteFirebaseUid: institute?.firebase_uid,
        hasInstitute: !!institute
      });
      
      return {
        job,
        institute
      };
    });

    console.log('📦 Bulk summary jobs structure:', summaryJobs.map(entry => ({
      jobId: entry.job?.id,
      jobFirebaseUid: entry.job?.firebase_uid,
      instituteFirebaseUid: entry.institute?.firebase_uid
    })));

    setBulkSummary({
      channel: bulkChannel,
      message: trimmedMessage,
      jobs: summaryJobs
    });
    setShowConfirmModal(true);
    setShowBulkMessageModal(false);
  }, [bulkChannel, bulkMessage, getSelectedRecords, buildInstituteData]);

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
      // Collect firebase_uid from all selected jobs/institutes
      const sendedTo = bulkSummary.jobs.map((entry, index) => {
        // Try multiple ways to get firebase_uid
        let firebaseUid = null;
        
        // First try from institute object
        if (entry.institute?.firebase_uid) {
          firebaseUid = entry.institute.firebase_uid;
        }
        // Then try from job object directly
        else if (entry.job?.firebase_uid) {
          firebaseUid = entry.job.firebase_uid;
        }
        // Try other possible fields in job
        else if (entry.job?.institute_firebase_uid) {
          firebaseUid = entry.job.institute_firebase_uid;
        }
        else if (entry.job?.organisation_firebase_uid) {
          firebaseUid = entry.job.organisation_firebase_uid;
        }
        else if (entry.job?.organization_firebase_uid) {
          firebaseUid = entry.job.organization_firebase_uid;
        }
        
        if (!firebaseUid) {
          console.warn(`⚠️ No firebase_uid found for job at index ${index}:`, {
            jobId: entry.job?.id,
            jobTitle: entry.job?.job_title,
            hasInstitute: !!entry.institute,
            instituteFirebaseUid: entry.institute?.firebase_uid,
            jobFirebaseUid: entry.job?.firebase_uid,
            jobKeys: entry.job ? Object.keys(entry.job) : []
          });
        }
        
        return firebaseUid;
      }).filter(uid => uid !== null && uid !== undefined); // Remove any null/undefined values

      console.log('📤 Collected firebase_uids for sendedTo:', sendedTo);
      console.log('📊 Total valid uids:', sendedTo.length, 'out of', bulkSummary.jobs.length);

      if (sendedTo.length === 0) {
        toast.error('No valid institutes found in selected jobs. Please ensure jobs have institute information.');
        setIsSendingBulk(false);
        return;
      }
      
      if (sendedTo.length < bulkSummary.jobs.length) {
        const missingCount = bulkSummary.jobs.length - sendedTo.length;
        console.warn(`⚠️ ${missingCount} job(s) missing firebase_uid and will be skipped`);
        toast.warning(`${missingCount} job(s) missing institute information and will be skipped.`);
      }

      // Get current user's firebase_uid
      const userFirebaseUid = user.firebase_uid || user.uid;
      if (!userFirebaseUid) {
        toast.error('User authentication required.');
        setIsSendingBulk(false);
        return;
      }

      // Validate sendedTo array before sending
      if (!Array.isArray(sendedTo) || sendedTo.length === 0) {
        console.error('❌ Invalid sendedTo array:', sendedTo);
        toast.error('No valid recipients found. Cannot submit message for approval.');
        setIsSendingBulk(false);
        return;
      }

      // Prepare payload for approval API
      // Note: Backend expects 'sendedeTo' (lowercase 'e'), not 'sendedTo'
      // Backend will JSON.stringify the array, so send as array (not string)
      const approvalPayload = {
        firebase_uid: userFirebaseUid,
        message: bulkSummary.message.trim(),
        sendedeTo: sendedTo, // Send as array - backend will JSON.stringify it
        channel: bulkSummary.channel || 'whatsapp', // Store selected channel (whatsapp or rcs)
        isApproved: false,
        isRejected: false,
        reason: ""
      };
      
      // Final validation - ensure sendedeTo is present and is an array
      if (!approvalPayload.sendedeTo || !Array.isArray(approvalPayload.sendedeTo) || approvalPayload.sendedeTo.length === 0) {
        console.error('❌ Validation failed - sendedeTo is invalid:', approvalPayload.sendedeTo);
        toast.error('Invalid recipient data. Please try again.');
        setIsSendingBulk(false);
        return;
      }
      
      console.log('📦 Final approval payload:', {
        firebase_uid: approvalPayload.firebase_uid,
        message: approvalPayload.message.substring(0, 50) + '...',
        sendedeTo: approvalPayload.sendedeTo,
        sendedeToLength: approvalPayload.sendedeTo.length,
        sendedeToType: Array.isArray(approvalPayload.sendedeTo) ? 'array' : typeof approvalPayload.sendedeTo,
        channel: approvalPayload.channel
      });
      
      // Log the actual JSON that will be sent
      console.log('📤 JSON payload to be sent:', JSON.stringify(approvalPayload));

      // Send to approval API
      const response = await fetch(
        'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/approveMessage',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(approvalPayload)
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      await response.json(); // Response received, no need to use the result
      
      toast.success(`Bulk message request submitted successfully! Your message is pending admin approval.`);
      
    } catch (error) {
      console.error('Error submitting bulk message for approval:', error);
      toast.error('Failed to submit message request. Please try again.');
    } finally {
      setIsSendingBulk(false);
      setShowConfirmModal(false);
      setBulkSummary(null);
      resetBulkForm();
      setSelectedJobs(new Set());
      setSelectAll(false);
    }
  }, [bulkSummary, resetBulkForm, user]);

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
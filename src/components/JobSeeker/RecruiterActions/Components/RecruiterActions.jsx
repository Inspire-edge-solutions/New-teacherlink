//RecruiterActions.jsx


import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../Context/AuthContext';
import RecruiterActionItem from './RecruiterActionItem';

const PERSONAL_API =
  'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal';
const REQUIREMENT_ACTION_API =
  'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/requirementAction';

const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Just now';

  const timestamp = new Date(dateString);
  if (Number.isNaN(timestamp.getTime())) {
    return 'Just now';
  }

  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();

  if (diffMs < 60000) return 'Just now';

  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return timestamp.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const RecruiterActions = () => {
  const { user } = useAuth();
  const firebaseUid = user?.uid;

  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecruiterActions = async () => {
      if (!firebaseUid) {
        setActions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: personalData } = await axios.get(PERSONAL_API);
        const personalList = Array.isArray(personalData) ? personalData : [];
        const currentProfile = personalList.find(
          (profile) => profile?.firebase_uid === firebaseUid
        );

        if (!currentProfile) {
          setActions([]);
          setLoading(false);
          return;
        }

        const candidateId =
          currentProfile?.candidate_id ??
          currentProfile?.candidateId ??
          currentProfile?.id;

        if (!candidateId) {
          setActions([]);
          setLoading(false);
          return;
        }

        const { data: requirementData } = await axios.get(
          REQUIREMENT_ACTION_API,
          {
            params: { firebase_uid: firebaseUid },
          }
        );

        const requirementList = Array.isArray(requirementData)
          ? requirementData
          : [];

        const filtered = requirementList.filter((item) => {
          if (!item) return false;
          if (item?.candidate_id) {
            return String(item.candidate_id) === String(candidateId);
          }
          return true;
        });

        const formatted = filtered.map((item) => ({
          id: item?.id ?? `${candidateId}-${item?.job_id ?? 'unknown'}`,
          organisation: item?.full_name?.trim() || 'Recruiter notification',
          action: item?.job_id ? 'recommended' : 'updated',
          context: item?.job_id
            ? `job ${item.job_id} for your profile.`
            : 'your profile.',
          timestamp: formatRelativeTime(item?.created_at),
          isUnread: false,
        }));

        setActions(formatted);
      } catch (fetchError) {
        console.error('Failed to load recruiter actions:', fetchError);
        const status = fetchError?.response?.status;
        if (status === 400) {
          const backendMessage =
            fetchError?.response?.data?.message ??
            'We could not find any recruiter updates for your profile yet.';
          setError(backendMessage);
        } else {
          setError('Unable to load recruiter actions right now.');
        }
        setActions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecruiterActions();
  }, [firebaseUid]);

  const hasActions = useMemo(
    () => Array.isArray(actions) && actions.length > 0,
    [actions]
  );

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#F7F7F9] py-8 px-4 sm:px-6 lg:px-10">
      <div className="max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1">
            Recruiter Actions
          </h1>
          <p className="text-sm sm:text-base text-gray-500 m-0">
            Track how recruiters are interacting with your profile.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Fetching recruiter activity
              </h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Please wait while we check for the latest updates.
              </p>
            </div>
          ) : error ? (
            <div className="px-6 py-10 text-center">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Something went wrong
              </h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                {error}
              </p>
            </div>
          ) : hasActions ? (
            <div className="divide-y divide-gray-100">
              {actions.map((actionItem, index) => (
                <RecruiterActionItem
                  key={actionItem.id || index}
                  action={actionItem}
                  isFirst={index === 0}
                />
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                No recruiter activity yet
              </h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                When recruiters share jobs that match your profile, activity will show up here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecruiterActions;

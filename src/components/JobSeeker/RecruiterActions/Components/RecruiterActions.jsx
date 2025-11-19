//RecruiterActions.jsx


import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../Context/AuthContext';
import RecruiterActionItem from './RecruiterActionItem';

const PERSONAL_API =
  'https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/personal';
const REQUIREMENT_ACTION_API =
  'https://2pn2aaw6f8.execute-api.ap-south-1.amazonaws.com/dev/requirementAction';
const FAV_API = 'https://0j7dabchm1.execute-api.ap-south-1.amazonaws.com/dev/favrouteUser';
const PROFILE_VIEW_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/profile_views';
const ORG_API = 'https://xx22er5s34.execute-api.ap-south-1.amazonaws.com/dev/organisation';

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

        // Fetch all actions in parallel
        const [requirementData, favData, profileViewData] = await Promise.all([
          axios.get(REQUIREMENT_ACTION_API, {
            params: { firebase_uid: firebaseUid },
          }).catch(() => ({ data: [] })),
          axios.get(FAV_API).catch(() => ({ data: [] })),
          axios.get(PROFILE_VIEW_API, {
            params: { viewed_user_id: firebaseUid },
          }).catch(() => ({ data: [] })),
        ]);

        const requirementList = Array.isArray(requirementData.data)
          ? requirementData.data
          : [];
        const favList = Array.isArray(favData.data) ? favData.data : [];
        const profileViewList = Array.isArray(profileViewData.data)
          ? profileViewData.data
          : [];

        // Filter requirement actions
        const filteredRequirements = requirementList.filter((item) => {
          if (!item) return false;
          if (item?.candidate_id) {
            return String(item.candidate_id) === String(candidateId);
          }
          return true;
        });

        // Filter favorite/save actions (where firebase_uid matches current user)
        const filteredFavActions = favList.filter((item) => {
          if (!item) return false;
          return (
            String(item.firebase_uid) === String(firebaseUid) &&
            (item.favroute_candidate === 1 || item.saved_candidate === 1)
          );
        });

        // Filter profile views (where viewed_user_id matches current user)
        const filteredProfileViews = profileViewList.filter((item) => {
          if (!item) return false;
          return String(item.viewed_user_id) === String(firebaseUid);
        });

        // Get unique organization IDs
        const orgIds = new Set();
        filteredRequirements.forEach((item) => {
          if (item?.firebase_uid) orgIds.add(item.firebase_uid);
        });
        filteredFavActions.forEach((item) => {
          if (item?.added_by) orgIds.add(item.added_by);
        });
        filteredProfileViews.forEach((item) => {
          if (item?.viewer_user_id) orgIds.add(item.viewer_user_id);
        });

        // Fetch organization names
        const orgNamesMap = new Map();
        await Promise.all(
          Array.from(orgIds).map(async (orgId) => {
            try {
              const { data: orgData } = await axios.get(ORG_API, {
                params: { firebase_uid: orgId },
              });
              const org = Array.isArray(orgData) ? orgData[0] : orgData;
              const orgName =
                org?.organisation_name ||
                org?.organization_name ||
                org?.school_name ||
                org?.name ||
                org?.institute_name ||
                'An Institution';
              orgNamesMap.set(orgId, orgName);
            } catch (error) {
              orgNamesMap.set(orgId, 'An Institution');
            }
          })
        );

        // Format requirement actions
        const formattedRequirements = filteredRequirements.map((item) => {
          const timestamp = item?.created_at;
          return {
            id: `req-${item?.id ?? `${candidateId}-${item?.job_id ?? 'unknown'}`}`,
            organisation:
              orgNamesMap.get(item?.firebase_uid) ||
              item?.full_name?.trim() ||
              'Recruiter notification',
            action: item?.job_id ? 'recommended' : 'updated',
            context: item?.job_id
              ? `job ${item.job_id} for your profile.`
              : 'your profile.',
            timestamp: formatRelativeTime(timestamp),
            rawTimestamp: timestamp,
            isUnread: false,
          };
        });

        // Format favorite actions
        const formattedFavorites = filteredFavActions
          .filter((item) => item.favroute_candidate === 1)
          .map((item) => {
            const timestamp = item?.created_at || item?.updated_at;
            return {
              id: `fav-${item?.id ?? `${item.added_by}-${item.firebase_uid}-${Date.now()}`}`,
              organisation:
                orgNamesMap.get(item?.added_by) || 'An Institution',
              action: 'favorited',
              context: 'your profile.',
              timestamp: formatRelativeTime(timestamp),
              rawTimestamp: timestamp,
              isUnread: false,
            };
          });

        // Format save actions
        const formattedSaves = filteredFavActions
          .filter((item) => item.saved_candidate === 1)
          .map((item) => {
            const timestamp = item?.created_at || item?.updated_at;
            return {
              id: `save-${item?.id ?? `${item.added_by}-${item.firebase_uid}-${Date.now()}`}`,
              organisation:
                orgNamesMap.get(item?.added_by) || 'An Institution',
              action: 'saved',
              context: 'your profile.',
              timestamp: formatRelativeTime(timestamp),
              rawTimestamp: timestamp,
              isUnread: false,
            };
          });

        // Format profile view actions
        const formattedViews = filteredProfileViews.map((item) => {
          const timestamp = item?.viewed_at || item?.created_at;
          return {
            id: `view-${item?.id ?? `${item.viewer_user_id}-${item.viewed_user_id}-${Date.now()}`}`,
            organisation:
              item?.institution_name ||
              orgNamesMap.get(item?.viewer_user_id) ||
              'An Institution',
            action: 'viewed',
            context: 'your profile.',
            timestamp: formatRelativeTime(timestamp),
            rawTimestamp: timestamp,
            isUnread: false,
          };
        });

        // Combine all actions and sort by raw timestamp (newest first)
        const allActions = [
          ...formattedRequirements,
          ...formattedFavorites,
          ...formattedSaves,
          ...formattedViews,
        ].sort((a, b) => {
          // Sort by raw timestamp (newest first)
          const timeA = a.rawTimestamp ? new Date(a.rawTimestamp).getTime() : 0;
          const timeB = b.rawTimestamp ? new Date(b.rawTimestamp).getTime() : 0;
          return timeB - timeA;
        });

        setActions(allActions);
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
    <div className="min-h-[calc(100vh-120px)] py-8 px-4 sm:px-6 lg:px-10">
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
            <div className="px-6 py-10 text-center bg-[#F0D8D9] rounded-2xl">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                No recruiter activity yet
              </h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                When recruiters shows interest in your profile, the activity will show up here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecruiterActions;
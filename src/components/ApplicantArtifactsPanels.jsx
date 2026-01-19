import React from 'react';

const formatDateLabel = (dateString) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return String(dateString);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const formatTime12h = (timeString) => {
  if (!timeString) return null;
  const raw = String(timeString);
  // If already includes AM/PM, keep it.
  if (/\b(am|pm)\b/i.test(raw)) return raw;
  // Accept "HH:MM" or "HH:MM:SS".
  const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return raw;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return raw;
  const d = new Date(2000, 0, 1, hh, mm, 0);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getFileName = (path) => {
  if (!path) return 'Document';
  const p = String(path);
  const parts = p.split('/');
  return parts[parts.length - 1] || 'Document';
};

const DocumentsGrid = ({ documents, getPublicUrl, columns = 2, variant = 'grid' }) => {
  const docs = Array.isArray(documents) ? documents.filter(Boolean) : [];
  if (docs.length === 0) return null;

  if (String(variant) === 'list') {
    return (
      <div className="space-y-2">
        {docs.map((doc) => {
          const path = doc.path || doc.file_path || doc.filePath || doc.storagePath;
          if (!path) return null;
          const url = getPublicUrl ? getPublicUrl(path) : null;
          const label = doc.label || doc.name || null;
          const originalName = doc.originalName || doc.original_name || null;
          const displayName = label || originalName || getFileName(path);

          return (
            <div
              key={String(path)}
              className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-md p-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{displayName}</div>
                <div className="text-xs text-gray-500 truncate">{originalName || getFileName(path)}</div>
                {doc.uploadedAt || doc.uploaded_at ? (
                  <div className="text-xs text-gray-400 mt-1">
                    Uploaded {formatDateLabel(doc.uploadedAt || doc.uploaded_at) || '—'}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-blue-600"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">Unavailable</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const gridClassName =
    Number(columns) === 1
      ? 'grid grid-cols-1 gap-3'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-3';

  return (
    <div className={gridClassName}>
      {docs.map((doc) => {
        const path = doc.path || doc.file_path || doc.filePath || doc.storagePath;
        if (!path) return null;
        const url = getPublicUrl ? getPublicUrl(path) : null;
        const label = doc.label || doc.name || null;
        const originalName = doc.originalName || doc.original_name || null;
        const displayName = label || originalName || getFileName(path);

        return (
          <div key={String(path)} className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{displayName}</div>
                <div className="text-xs text-gray-500 truncate">{originalName || getFileName(path)}</div>
                {doc.uploadedAt || doc.uploaded_at ? (
                  <div className="text-xs text-gray-400 mt-1">
                    Uploaded {formatDateLabel(doc.uploadedAt || doc.uploaded_at) || '—'}
                  </div>
                ) : null}
              </div>

              <div className="flex-shrink-0">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 rounded-md bg-white border border-gray-300 hover:bg-gray-100 text-sm font-semibold text-blue-600"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">Unavailable</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export function UploadedDocumentsSection({
  title,
  emptyText,
  documents,
  getPublicUrl,
  columns = 2,
  variant = 'grid',
}) {
  const docs = Array.isArray(documents) ? documents.filter(Boolean) : [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">{docs.length ? `${docs.length} file${docs.length === 1 ? '' : 's'}` : ''}</div>
      </div>

      {docs.length === 0 ? (
        <div className="p-5 text-sm text-gray-600">{emptyText}</div>
      ) : (
        <div className="p-4">
          <DocumentsGrid documents={docs} getPublicUrl={getPublicUrl} columns={columns} variant={variant} />
        </div>
      )}
    </div>
  );
}

export function AssessmentSectionCard({
  schedule,
  interviewConfirmed,
  rescheduleRequest,
  onRequestReschedule,
}) {
  const hasInterview = Boolean(schedule?.date || schedule?.time || schedule?.location);
  const confirmedRaw = interviewConfirmed ? String(interviewConfirmed).trim() : '';
  const confirmedLower = confirmedRaw.toLowerCase();
  const isIdle = !confirmedLower || confirmedLower === 'idle';
  const isRejectedLegacy = confirmedRaw && confirmedRaw.toLowerCase() === 'rejected';

  const reqObj = rescheduleRequest && typeof rescheduleRequest === 'object' ? rescheduleRequest : null;
  const reqHandled = Boolean(reqObj && (reqObj.handled_at || reqObj.handledAt));
  const reqActive = Boolean(
    reqObj &&
    !reqHandled &&
    (reqObj.requested_at || reqObj.requestedAt || reqObj.note || reqObj.preferred_date || reqObj.preferredDate)
  );
  const reqEver = Boolean(
    reqObj &&
    (reqObj.requested_at ||
      reqObj.requestedAt ||
      reqObj.note ||
      reqObj.preferred_date ||
      reqObj.preferredDate ||
      reqObj.preferred_time_from ||
      reqObj.preferredTimeFrom ||
      reqObj.preferred_time_to ||
      reqObj.preferredTimeTo ||
      reqObj.handled_at ||
      reqObj.handledAt)
  );
  const isRescheduleRequested = Boolean(hasInterview && (isRejectedLegacy || reqActive));
  const hasEverRescheduleRequest = Boolean(hasInterview && (isRejectedLegacy || reqEver));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#800000]/10 text-[#800000] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M6.75 2.25A2.25 2.25 0 0 0 4.5 4.5v15A2.25 2.25 0 0 0 6.75 21.75h10.5A2.25 2.25 0 0 0 19.5 19.5v-15A2.25 2.25 0 0 0 17.25 2.25H6.75Zm.75 4.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Assessment Schedule</div>
            <div className="text-xs text-gray-500">Set by HR after review</div>
          </div>
        </div>

        {hasInterview ? (
          <span
            className={`text-xs px-2 py-1 rounded-full font-semibold border ${
              isRescheduleRequested
                ? 'bg-orange-50 text-orange-800 border-orange-200'
                : 'bg-cyan-50 text-cyan-800 border-cyan-200'
            }`}
          >
            {isRescheduleRequested ? 'Reschedule Requested' : 'Schedule Set'}
          </span>
        ) : null}
      </div>

      {hasInterview ? (
        <>
          <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-semibold text-gray-900">{formatDateLabel(schedule?.date) || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Time</span>
              <span className="font-semibold text-gray-900">{formatTime12h(schedule?.time) || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Location</span>
              <span className="font-semibold text-gray-900">{schedule?.location || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Interviewer</span>
              <span className="font-semibold text-gray-900">{schedule?.interviewer || '—'}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              {isRescheduleRequested
                ? 'Reschedule has been requested. Please wait for HR to update the schedule.'
                : hasEverRescheduleRequest
                  ? 'A reschedule was already requested once for this interview.'
                  : 'If you need changes, request a reschedule.'}
            </div>
            {hasInterview && isIdle && !hasEverRescheduleRequest && typeof onRequestReschedule === 'function' ? (
              <button
                type="button"
                onClick={onRequestReschedule}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm font-medium transition-colors"
              >
                Request Reschedule
              </button>
            ) : null}
          </div>

          {isRescheduleRequested && reqObj?.note ? (
            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-gray-800 whitespace-pre-wrap">
              <span className="font-semibold">Note:</span> {String(reqObj.note)}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Date</span>
              <span className="text-gray-500 italic">To be scheduled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Time</span>
              <span className="text-gray-500 italic">To be scheduled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Location</span>
              <span className="text-gray-500 italic">To be scheduled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Interviewer</span>
              <span className="text-gray-500 italic">To be assigned</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Important Reminder: The assessment schedule will be set by HR once the application is reviewed.
          </div>
        </>
      )}
    </div>
  );
}

export function RemarksAndFilesCard({
  title,
  remarks,
  emptyRemarksText,
  files,
  getPublicUrl,
}) {
  const normalized = remarks ? String(remarks).trim() : '';
  const isEmpty = !normalized || normalized.toLowerCase() === String(emptyRemarksText || '').toLowerCase();
  const displayText = isEmpty ? (emptyRemarksText || 'No uploaded remarks or files.') : normalized;

  const docs = Array.isArray(files) ? files.filter((f) => f && (f.path || f.file_path || f.filePath || f.storagePath)) : [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
      </div>

      <div className="p-4 space-y-4">
        <div className="text-sm">
          {isEmpty ? (
            <div className="flex items-center gap-2 text-gray-500 italic">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 18a6 6 0 100-12 6 6 0 000 12z" />
              </svg>
              <span>{displayText}</span>
            </div>
          ) : (
            <>
              <div className="text-xs font-semibold text-gray-600">Remarks</div>
              <div className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800">
                {displayText}
              </div>
            </>
          )}
        </div>

        {docs.length ? (
          <div>
            <DocumentsGrid
              documents={docs.map((d) => ({
                path: d.path || d.file_path || d.filePath || d.storagePath,
                label: d.label,
                originalName: d.originalName,
                uploadedAt: d.uploadedAt,
              }))}
              getPublicUrl={getPublicUrl}
              columns={1}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SigningScheduleCard({ signing, locked }) {
  const hasSigning = Boolean(signing?.date || signing?.time || signing?.location);
  const signingDate = signing?.date ? formatDateLabel(signing.date) : null;
  const signingTime = signing?.time ? formatTime12h(signing.time) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">Signing appointment schedule</div>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-semibold border ${
            hasSigning
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-gray-50 text-gray-600 border-gray-200'
          }`}
        >
          {hasSigning ? 'Schedule Set' : 'Not Set'}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Date</span>
          <span className="font-semibold text-gray-900">{signingDate || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Time</span>
          <span className="font-semibold text-gray-900">{signingTime || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Location</span>
          <span className="font-semibold text-gray-900">{signing?.location || '—'}</span>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-500">
        Stay posted for the agreement signing schedule. We will post as soon as possible.
      </div>
      {locked ? (
        <div className="mt-3 text-xs text-gray-500">Agreements are locked while reschedule is pending.</div>
      ) : null}
    </div>
  );
}

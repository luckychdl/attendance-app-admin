import { type FormEvent, useEffect, useState } from 'react';

import { adminApi } from '@/api/admin';
import { errorMessage } from '@/api/client';
import type { Worksite } from '@/api/types';
import { Empty, ErrorNote, Field, PageHeader } from '@/components/ui';
import { useQuery } from '@/hooks/use-query';
import { formatClock, parseClock, workEnd, workStart } from '@/lib/format';

type Draft = {
  name: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
  start: string;
  end: string;
};

function toDraft(worksite: Worksite): Draft {
  return {
    name: worksite.name,
    latitude: String(worksite.latitude),
    longitude: String(worksite.longitude),
    radiusMeters: String(worksite.radiusMeters),
    start: formatClock(workStart(worksite)),
    end: formatClock(workEnd(worksite)),
  };
}

export function WorksitePage() {
  const query = useQuery(() => adminApi.worksite(), []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (query.data) setDraft(toDraft(query.data));
  }, [query.data]);

  const set = (key: keyof Draft, value: string) => {
    setSaved(false);
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  function fillCurrentLocation() {
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        set('latitude', coords.latitude.toFixed(7));
        set('longitude', coords.longitude.toFixed(7));
        setLocating(false);
      },
      () => {
        setError('현재 위치를 가져오지 못했습니다. 브라우저의 위치 권한을 확인해 주세요.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const start = parseClock(draft.start);
    const end = parseClock(draft.end);

    setBusy(true);
    setError(null);
    try {
      const next = await adminApi.updateWorksite({
        name: draft.name,
        latitude: Number(draft.latitude),
        longitude: Number(draft.longitude),
        radiusMeters: Number(draft.radiusMeters),
        startHour: Math.floor(start / 60),
        startMinute: start % 60,
        endHour: Math.floor(end / 60),
        endMinute: end % 60,
      });
      query.setData(next);
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!draft) {
    return (
      <>
        <PageHeader title="근무지" />
        {query.error ? (
          <ErrorNote message={query.error} onRetry={query.reload} />
        ) : (
          <Empty>근무지를 불러오는 중입니다.</Empty>
        )}
      </>
    );
  }

  const mapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(draft.name || '근무지')},${draft.latitude},${draft.longitude}`;

  return (
    <>
      <PageHeader
        title="근무지"
        description="출퇴근을 기록할 수 있는 위치와 근무시간입니다. 저장하면 전 직원에게 바로 적용됩니다."
      />

      <form className="form panel" onSubmit={submit}>
        <Field label="근무지 이름">
          <input
            value={draft.name}
            onChange={(event) => set('name', event.target.value)}
            maxLength={50}
            required
          />
        </Field>

        <fieldset className="form-group">
          <legend>위치</legend>
          <div className="form-grid">
            <Field label="위도">
              <input
                type="number"
                value={draft.latitude}
                onChange={(event) => set('latitude', event.target.value)}
                min={-90}
                max={90}
                step="any"
                required
              />
            </Field>
            <Field label="경도">
              <input
                type="number"
                value={draft.longitude}
                onChange={(event) => set('longitude', event.target.value)}
                min={-180}
                max={180}
                step="any"
                required
              />
            </Field>
            <Field label="허용 반경 (m)" hint="이 거리 밖에서는 사유를 남겨야 기록됩니다. 10–5000m">
              <input
                type="number"
                value={draft.radiusMeters}
                onChange={(event) => set('radiusMeters', event.target.value)}
                min={10}
                max={5000}
                step={1}
                required
              />
            </Field>
          </div>
          <div className="row-actions">
            <button
              type="button"
              className="button"
              onClick={fillCurrentLocation}
              disabled={locating || !('geolocation' in navigator)}
            >
              {locating ? '위치를 찾는 중' : '현재 위치로 채우기'}
            </button>
            <a className="button button-quiet" href={mapUrl} target="_blank" rel="noreferrer">
              지도에서 확인
            </a>
          </div>
        </fieldset>

        <fieldset className="form-group">
          <legend>근무시간</legend>
          <div className="form-grid">
            <Field label="시작" hint="5분을 넘겨 출근하면 지각입니다.">
              <input
                type="time"
                value={draft.start}
                onChange={(event) => set('start', event.target.value)}
                required
              />
            </Field>
            <Field label="종료">
              <input
                type="time"
                value={draft.end}
                onChange={(event) => set('end', event.target.value)}
                required
              />
            </Field>
          </div>
        </fieldset>

        {error && (
          <div className="note note-error" role="alert">
            {error}
          </div>
        )}

        <div className="form-actions">
          {saved && (
            <span className="saved" role="status">
              저장했습니다.
            </span>
          )}
          <button type="submit" className="button button-primary" disabled={busy}>
            변경 내용 저장
          </button>
        </div>
      </form>
    </>
  );
}

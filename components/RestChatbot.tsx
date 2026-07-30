'use client';

import { FormEvent, useState } from 'react';
import { Bot, Loader2, MapPin, Send } from 'lucide-react';
import { Chair } from '@/types/chair';
import { fetchJson } from '@/lib/fetch-json';

type ChatPlace = {
  id: string;
  building: string;
  floor: string;
  name: string;
  description: string;
  seatCount: number | null;
  outletAvailable: boolean | null;
  tableAvailable: boolean | null;
  quiet: boolean | null;
  backrestAvailable: boolean | null;
  wheelchairAccessible: boolean | null;
  wheelchairParkingAvailable: boolean | null;
  x: number | null;
  y: number | null;
  facts: string[];
};

type ChatResult = {
  answer: string;
  matchedSpotIds: string[];
  found: boolean;
  places?: ChatPlace[];
};

type ChatMessage =
  | {
      id: string;
      role: 'user';
      text: string;
    }
  | {
      id: string;
      role: 'bot';
      text: string;
      matchedSpotIds: string[];
      found: boolean;
      places: ChatPlace[];
      pending?: boolean;
      error?: boolean;
    };

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function placeToChairPlace(place: ChatPlace, chairs: Chair[]) {
  return chairs.find((item) => item.id === place.id) ?? null;
}

export default function RestChatbot({ chairs, onOpenMap }: { chairs: Chair[]; onOpenMap: (chair: Chair) => void }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: '원하시는 조건을 말씀해 주세요. 건물, 층, 편의 정보까지 함께 안내해드릴게요.',
      matchedSpotIds: [],
      found: false,
      places: [],
    },
  ]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || loading) return;

    const value = question.trim();
    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      text: value,
    };
    const pendingId = createId();

    setQuestion('');
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: pendingId,
        role: 'bot',
        text: '찾고 있어요...',
        matchedSpotIds: [],
        found: false,
        places: [],
        pending: true,
      },
    ]);

    try {
      const data = await fetchJson<ChatResult & { error?: string }>('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: value }),
      });

      if (!data) {
        throw new Error('챗봇 응답을 받지 못했어요.');
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId && message.role === 'bot'
            ? {
                id: pendingId,
                role: 'bot',
                text: data.answer,
                matchedSpotIds: data.matchedSpotIds ?? [],
                found: Boolean(data.found),
                places: data.places ?? [],
              }
            : message,
        ),
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId && message.role === 'bot'
            ? {
                id: pendingId,
                role: 'bot',
                text: error instanceof Error ? error.message : '챗봇 연결 중 문제가 생겼어요.',
                matchedSpotIds: [],
                found: false,
                places: [],
                error: true,
              }
            : message,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex min-h-[620px] max-h-[calc(100vh-180px)] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(24,50,74,0.08)]">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-[#18324a] px-4 py-4 text-white">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15">
          <Bot size={20} />
        </span>
        <div>
          <strong className="block text-sm font-extrabold">휴식공간 챗봇</strong>
          <span className="text-xs text-slate-300">등록된 데이터 기준으로만 안내합니다.</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
        {messages.map((message) => {
          if (message.role === 'user') {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[92%] rounded-2xl rounded-br-sm bg-[#1668c7] px-3 py-2.5 text-sm leading-6 text-white shadow-sm">
                  {message.text}
                </div>
              </div>
            );
          }

          const resultPlaces = message.places ?? [];

          return (
            <div key={message.id} className="space-y-3">
              <div
                className={`max-w-[92%] rounded-2xl rounded-tl-sm px-3 py-2.5 text-sm leading-6 shadow-sm ${
                  message.pending
                    ? 'bg-white text-slate-500'
                    : message.error
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-white text-slate-700'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {message.pending ? <Loader2 size={15} className="animate-spin" /> : null}
                  {message.text}
                </span>
              </div>

              {!message.pending && message.found && resultPlaces.length > 0 && (
                <div className="space-y-3">
                  {resultPlaces.map((place) => {
                    const chair = placeToChairPlace(place, chairs);
                    const previewFacts = place.facts.slice(0, 3);

                    return (
                      <div key={place.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#0d9c9a]">
                              <MapPin size={14} className="shrink-0" />
                              <span>
                                {place.building} {place.floor}
                              </span>
                            </div>
                            <h3 className="mt-2 text-sm font-extrabold text-slate-900">{place.name}</h3>
                            {place.description ? (
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                                {place.description}
                              </p>
                            ) : null}
                          </div>

                          {chair ? (
                            <button
                              type="button"
                              onClick={() => onOpenMap(chair)}
                              className="shrink-0 rounded-full bg-[#1668c7] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1457a5]"
                            >
                              지도에서 보기
                            </button>
                          ) : null}
                        </div>

                        {previewFacts.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {previewFacts.map((fact) => (
                              <span
                                key={fact}
                                className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                              >
                                {fact}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              {!message.pending && message.found && resultPlaces.length === 0 && message.matchedSpotIds.length > 0 && (
                <div className="space-y-2">
                  {message.matchedSpotIds.map((id) => {
                    const chair = chairs.find((item) => item.id === id);
                    return chair ? (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onOpenMap(chair)}
                        className="flex w-full items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-left text-xs font-bold text-blue-900"
                      >
                        <MapPin size={16} className="shrink-0 text-[#1668c7]" />
                        <span>
                          {chair.building} {chair.floor} · {chair.name}
                          <small className="mt-1 block font-normal text-blue-700">지도로 위치 보기</small>
                        </span>
                      </button>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 bg-white p-3">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="예: 본관 1층에서 콘센트 있는 곳"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          aria-label="휴식공간 질문"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#1668c7] text-white disabled:bg-slate-300"
          aria-label="질문 보내기"
        >
          <Send size={17} />
        </button>
      </form>
    </section>
  );
}

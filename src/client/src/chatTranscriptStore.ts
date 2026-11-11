import { normalizeMessages } from "./chatMessages";
import { applyTranscriptEvent, applyTranscriptEvents } from "./chatTranscript";
import { mergeChatHistory, readChatHistoryCache, removeChatHistoryCache, writeChatHistoryCache, type RawMessagePage } from "./chatHistoryCache";
import type { ChatLine } from "./components/shared";
import type { SessionUiEvent } from "./sessionSocket";

export interface ChatTranscriptView {
  messages: ChatLine[];
  messagePageStart: number;
  // End offset in the raw transcript. Normalization may coalesce multiple raw
  // entries into one displayed chat message, especially tool calls/results.
  messagePageEnd: number;
  messagePageTotal: number;
}

export interface ChatHistoryCacheAdapter {
  read(sessionId: string): RawMessagePage | undefined;
  write(sessionId: string, page: RawMessagePage): void;
  remove?(sessionId: string): void;
}

const browserChatHistoryCache: ChatHistoryCacheAdapter = {
  read: readChatHistoryCache,
  write: writeChatHistoryCache,
  remove: removeChatHistoryCache,
};

export const DEFAULT_MAX_IN_MEMORY_TRANSCRIPTS = 5;

export class ChatTranscriptStore {
  private readonly rawHistoryPages = new Map<string, RawMessagePage>();

  constructor(
    private readonly cache: ChatHistoryCacheAdapter = browserChatHistoryCache,
    private readonly maxInMemory = DEFAULT_MAX_IN_MEMORY_TRANSCRIPTS,
  ) {}

  cachedView(sessionId: string): ChatTranscriptView {
    return transcriptViewFromHistory(this.rawHistoryPage(sessionId));
  }

  mergeHistory(sessionId: string, page: RawMessagePage): ChatTranscriptView {
    const history = mergeChatHistory(this.rawHistoryPage(sessionId), page);
    this.retainInMemory(sessionId, history);
    this.cache.write(sessionId, history);
    return transcriptViewFromHistory(history);
  }

  applyLiveEvent(messages: ChatLine[], event: SessionUiEvent): ChatLine[] | undefined {
    return applyTranscriptEvent(messages, event);
  }

  applyLiveEvents(messages: ChatLine[], events: SessionUiEvent[]): ChatLine[] {
    return applyTranscriptEvents(messages, events);
  }

  discard(sessionId: string): void {
    this.rawHistoryPages.delete(sessionId);
    this.cache.remove?.(sessionId);
  }

  rawHistoryPage(sessionId: string): RawMessagePage | undefined {
    let cached = this.rawHistoryPages.get(sessionId);
    if (cached !== undefined) {
      this.rawHistoryPages.delete(sessionId);
      this.rawHistoryPages.set(sessionId, cached);
      return cached;
    }
    cached = this.cache.read(sessionId);
    if (cached !== undefined) {
      this.retainInMemory(sessionId, cached);
    }
    return cached;
  }

  private retainInMemory(sessionId: string, page: RawMessagePage): void {
    this.rawHistoryPages.delete(sessionId);
    this.rawHistoryPages.set(sessionId, page);
    while (this.rawHistoryPages.size > this.maxInMemory) {
      const oldestKey = this.rawHistoryPages.keys().next().value;
      if (oldestKey === undefined) break;
      this.rawHistoryPages.delete(oldestKey);
    }
  }
}

export function transcriptViewFromHistory(history: RawMessagePage | undefined): ChatTranscriptView {
  const start = history?.start ?? 0;
  return {
    messages: normalizeMessages(history?.messages ?? []),
    messagePageStart: start,
    messagePageEnd: start + (history?.messages.length ?? 0),
    messagePageTotal: history?.total ?? 0,
  };
}

export interface WhatsAppProvider {
  sendMessage(to: string, body: string): Promise<void>;
}

export interface OrderContext {
  id: string;
  title: string;
  status: string;
  producerId?: string | null;
  clientName?: string | null;
  producerName?: string | null;
  studioName?: string | null;
  agreedPrice?: number | null;
  currency?: string | null;
  dueDate?: Date | string | null;
}

export interface BriefContext {
  id: string;
  styleSummary?: string | null;
  occasion?: string | null;
}

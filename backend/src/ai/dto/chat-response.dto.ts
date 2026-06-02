export class AiSourceDto {
  type: 'work_item' | 'project' | 'sprint' | 'milestone';
  id: string;
  title: string;
}

export class ChatResponseDto {
  answer: string;
  sources: AiSourceDto[];
  toolsUsed: string[];
  conversationId: string;
}

export class HealthResponseDto {
  status: 'ok' | 'degraded';
  ollama: {
    reachable: boolean;
    model: string;
  };
  version: string;
}

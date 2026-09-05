export interface CommentAuthor {
  id: string;
  fullName: string;
}

export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  author: CommentAuthor;
}

export interface CreateCommentPayload {
  content: string;
}

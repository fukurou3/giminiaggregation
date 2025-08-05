import { Post } from "./Post";

export type Topic = {
  id: string;
  name: string;
  type: 'genre' | 'tag';
  description?: string;
  popularityScore: number;
  posts: Post[];
  totalPosts: number;
  icon?: string;
  color?: string;
};

export type TopicHighlight = {
  topic: Topic;
  featuredPosts: Post[];
};
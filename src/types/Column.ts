

export interface ColumnSummary {
  id: string;
  title: string;
  slug: string;
  author: string;
  excerpt: string;
  coverImage?: string;
  category: string;
  createdAt: Date;
  updatedAt?: Date;
  views: number;
  likes: number;
  isPublished: boolean;
  featured?: boolean;
}

export interface Column extends ColumnSummary {
  body: string; // HTML content

  isPublic?: boolean;
}
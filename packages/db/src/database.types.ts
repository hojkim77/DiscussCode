// Manually maintained — run `pnpm --filter @discusscode/db generate` against a live Supabase project to regenerate.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          handle: string;
          email: string | null;
          github_id: number | null;
          github_handle: string | null;
          google_id: string | null;
          avatar: string | null;
          bio: string | null;
          reputation: number;
          is_public: boolean;
          is_verified_dev: boolean;
          write_banned_until: string | null;
          violation_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          handle: string;
          email?: string | null;
          github_id?: number | null;
          github_handle?: string | null;
          google_id?: string | null;
          avatar?: string | null;
          bio?: string | null;
          reputation?: number;
          is_public?: boolean;
          is_verified_dev?: boolean;
          write_banned_until?: string | null;
          violation_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          handle?: string;
          email?: string | null;
          github_id?: number | null;
          github_handle?: string | null;
          google_id?: string | null;
          avatar?: string | null;
          bio?: string | null;
          reputation?: number;
          is_public?: boolean;
          is_verified_dev?: boolean;
          write_banned_until?: string | null;
          violation_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      repos: {
        Row: {
          id: string;
          github_id: number;
          owner: string;
          name: string;
          full_name: string;
          description: string | null;
          language: string | null;
          stars: number;
          forks: number;
          license: string | null;
          topics: string[];
          open_issues: number;
          heat_score: number;
          summary_ai: string | null;
          readme_sha: string | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          github_id: number;
          owner: string;
          name: string;
          full_name: string;
          description?: string | null;
          language?: string | null;
          stars?: number;
          forks?: number;
          license?: string | null;
          topics?: string[];
          open_issues?: number;
          heat_score?: number;
          summary_ai?: string | null;
          readme_sha?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          github_id?: number;
          owner?: string;
          name?: string;
          full_name?: string;
          description?: string | null;
          language?: string | null;
          stars?: number;
          forks?: number;
          license?: string | null;
          topics?: string[];
          open_issues?: number;
          heat_score?: number;
          summary_ai?: string | null;
          readme_sha?: string | null;
          last_synced_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      repo_snapshots: {
        Row: {
          id: string;
          repo_id: string;
          stars: number;
          forks: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          repo_id: string;
          stars: number;
          forks: number;
          recorded_at?: string;
        };
        Update: {
          stars?: number;
          forks?: number;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "repo_snapshots_repo_id_fkey";
            columns: ["repo_id"];
            isOneToOne: false;
            referencedRelation: "repos";
            referencedColumns: ["id"];
          }
        ];
      };
      watched_repos: {
        Row: {
          id: string;
          owner: string;
          name: string;
          full_name: string;
          domain: string | null;
          is_active: boolean;
          added_at: string;
        };
        Insert: {
          id?: string;
          owner: string;
          name: string;
          full_name: string;
          domain?: string | null;
          is_active?: boolean;
          added_at?: string;
        };
        Update: {
          owner?: string;
          name?: string;
          full_name?: string;
          domain?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      issue_items: {
        Row: {
          id: string;
          github_id: number;
          repo_id: string | null;
          watched_repo_id: string | null;
          repo_full_name: string;
          issue_number: number;
          title: string;
          body_md: string | null;
          labels: string[];
          state: "open" | "closed";
          comment_count: number;
          reaction_plus1: number;
          heat_score: number;
          summary_ai: string | null;
          github_url: string;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          github_id: number;
          repo_id?: string | null;
          watched_repo_id?: string | null;
          repo_full_name: string;
          issue_number: number;
          title: string;
          body_md?: string | null;
          labels?: string[];
          state?: "open" | "closed";
          comment_count?: number;
          reaction_plus1?: number;
          heat_score?: number;
          summary_ai?: string | null;
          github_url: string;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          github_id?: number;
          repo_id?: string | null;
          watched_repo_id?: string | null;
          repo_full_name?: string;
          issue_number?: number;
          title?: string;
          body_md?: string | null;
          labels?: string[];
          state?: "open" | "closed";
          comment_count?: number;
          reaction_plus1?: number;
          heat_score?: number;
          summary_ai?: string | null;
          github_url?: string;
          last_synced_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issue_items_watched_repo_id_fkey";
            columns: ["watched_repo_id"];
            isOneToOne: false;
            referencedRelation: "watched_repos";
            referencedColumns: ["id"];
          }
        ];
      };
      talks: {
        Row: {
          id: string;
          category: "REPO" | "ISSUE" | "OPEN" | "TREND";
          ref_id: string | null;
          author_id: string | null;
          title: string;
          body_md: string | null;
          tags: string[];
          talk_type: string | null;
          heat_score: number;
          upvotes: number;
          downvotes: number;
          comment_count: number;
          unique_participants: number;
          view_count: number;
          is_pinned: boolean;
          is_deleted: boolean;
          search_vector: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: "REPO" | "ISSUE" | "OPEN" | "TREND";
          ref_id?: string | null;
          author_id?: string | null;
          title: string;
          body_md?: string | null;
          tags?: string[];
          talk_type?: string | null;
          heat_score?: number;
          upvotes?: number;
          downvotes?: number;
          comment_count?: number;
          unique_participants?: number;
          view_count?: number;
          is_pinned?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category?: "REPO" | "ISSUE" | "OPEN" | "TREND";
          ref_id?: string | null;
          author_id?: string | null;
          title?: string;
          body_md?: string | null;
          tags?: string[];
          talk_type?: string | null;
          heat_score?: number;
          upvotes?: number;
          downvotes?: number;
          comment_count?: number;
          unique_participants?: number;
          view_count?: number;
          is_pinned?: boolean;
          is_deleted?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "talks_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      comments: {
        Row: {
          id: string;
          talk_id: string;
          parent_id: string | null;
          author_id: string;
          body_md: string;
          upvotes: number;
          downvotes: number;
          depth: number;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          talk_id: string;
          parent_id?: string | null;
          author_id: string;
          body_md: string;
          upvotes?: number;
          downvotes?: number;
          depth?: number;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          parent_id?: string | null;
          body_md?: string;
          upvotes?: number;
          downvotes?: number;
          depth?: number;
          is_deleted?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_talk_id_fkey";
            columns: ["talk_id"];
            isOneToOne: false;
            referencedRelation: "talks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      reactions: {
        Row: {
          id: string;
          target_type: "talk" | "comment";
          target_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_type: "talk" | "comment";
          target_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: { emoji?: string };
        Relationships: [];
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          talk_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          talk_id: string;
          created_at?: string;
        };
        Update: { user_id?: string; talk_id?: string };
        Relationships: [
          {
            foreignKeyName: "bookmarks_talk_id_fkey";
            columns: ["talk_id"];
            isOneToOne: false;
            referencedRelation: "talks";
            referencedColumns: ["id"];
          }
        ];
      };
      follows: {
        Row: {
          id: string;
          user_id: string;
          target_type: "REPO" | "TAG" | "USER";
          target_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_type: "REPO" | "TAG" | "USER";
          target_id: string;
          created_at?: string;
        };
        Update: { target_type?: "REPO" | "TAG" | "USER"; target_id?: string };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "reply" | "mention" | "hot_talk" | "follow";
          payload: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "reply" | "mention" | "hot_talk" | "follow";
          payload: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: { read_at?: string | null };
        Relationships: [];
      };
      drafts: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          body_md: string | null;
          tags: string[];
          talk_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          body_md?: string | null;
          tags?: string[];
          talk_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string | null;
          body_md?: string | null;
          tags?: string[];
          talk_type?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          id: string;
          target_type: "talk" | "comment";
          target_id: string;
          user_id: string;
          value: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_type: "talk" | "comment";
          target_id: string;
          user_id: string;
          value: number;
          created_at?: string;
        };
        Update: { value?: number };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
